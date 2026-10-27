const { recordSessionBallot } = require('../utils/ballotSubmission');
const { publicParticipant, authenticatedParticipant, authenticatedHost, forbidden } = require('../utils/roomSecurity');
const { sanitizeBallot } = require('../utils/ballot');
const crypto = require('crypto');
const {
  createRoom,
  createParticipantWithId,
  getRoomByPin,
  getRoomWithVotesByPin,
  updateRoomConfig,
  updateParticipantBudget,
  createOptionsBulk,
  submitVenueFeedback,   //Afina
} = require('../../db/helpers');

const { getIO } = require('../utils/socket');
const { generatePin, issueHostToken, verifyHostToken } = require('../utils/hostAuth');
const { buildOptionRecords, discoverDiscoveryVenues, expandRoomVenues } = require('../services/venueDiscoveryService');
const { reportClosedVenue } = require('../utils/reportedVenues');
const { dispatchActivityNotification } = require('../utils/storageSafeguard');
const { calculateSchulzeWinner } = require('../utils/schulze');
const { roomSummaryCache, activeLobbies, activeVotingSessions } = require('../sockets/socketSessionStore');

// High-capacity in-memory cache (5m TTL, 2000 rooms) for 1000+ CCU room lookups
const roomResponseCache = new Map();
const MAX_ROOM_CACHE = 2000;

function setBoundedRoomCache(pin, payload, ttlMs = 300000) {
  if (roomResponseCache.size >= MAX_ROOM_CACHE) {
    const oldest = roomResponseCache.keys().next().value;
    if (oldest) roomResponseCache.delete(oldest);
  }
  roomResponseCache.set(String(pin), { payload, expiresAt: Date.now() + ttlMs });
}

function invalidateRoomCache(pin) {
  if (pin) roomResponseCache.delete(String(pin));
}

const createNewRoom = async (req, res) => {
  // Sprint 2: Added mode, theme, radius, latitude, longitude, and is_exact_gps
  const {
    host_id,
    device_id,
    host_device_id,
    mode = 'DISCOVERY',
    theme = 'restaurant',
    radius = 5000,
    latitude,
    longitude,
    is_exact_gps = false,
  } = req.body || {};

  if (typeof host_id !== 'string' || host_id.length > 64 || !host_id.trim() ||
      typeof (host_device_id || device_id) !== 'string' || (host_device_id || device_id).length < 8 ||
      (host_device_id || device_id).length > 64 || !['CUSTOM', 'DISCOVERY'].includes(mode) ||
      typeof theme !== 'string' || theme.length > 120 || !Number.isInteger(radius) || radius < 100 || radius > 50000 ||
      (latitude != null && (!Number.isFinite(Number(latitude)) || Math.abs(Number(latitude)) > 90)) ||
      (longitude != null && (!Number.isFinite(Number(longitude)) || Math.abs(Number(longitude)) > 180))) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_HOST_ID',
      message: 'Valid host/device identifiers, mode, theme, radius and coordinates are required.',
    });
  }

  // Live test harnesses must opt in with the infrastructure credential. Public
  // request bodies cannot hide sessions from the owner's activity figures.
  const isTest = req.get('X-NoYouPick-Test') === '1';
  if (isTest) {
    const expected = process.env.ADMIN_API_KEY;
    const supplied = req.get('X-Admin-Key') || '';
    if (!expected || !crypto.timingSafeEqual(crypto.createHash('sha256').update(supplied).digest(), crypto.createHash('sha256').update(expected).digest())) {
      return res.status(403).json({success:false,error:'FORBIDDEN'});
    }
  }
  const hostDeviceId = host_device_id || device_id || null;
  const cleanHostDeviceId = hostDeviceId && typeof hostDeviceId === 'string' ? hostDeviceId.trim().slice(0, 64) : null;
  const roomTheme = mode === 'CUSTOM' ? `custom:${theme || 'poll'}` : theme;

  // Generate unique 4-digit PIN in RAM (checking active caches first for 0ms collision avoidance)
  let pin = generatePin();
  for (let attempt = 0; attempt < 20; attempt++) {
    if (!roomResponseCache.has(pin) && !roomSummaryCache.has(pin) && !activeLobbies?.has(pin) && !activeVotingSessions?.has(pin)) break;
    pin = generatePin();
  }
  const roomId = crypto.randomUUID();

  // Resolve discovery venues from in-memory spatial catalog (<1ms)
  const places = mode === 'DISCOVERY'
    ? await discoverDiscoveryVenues({
        theme,
        latitude,
        longitude,
        radius,
        is_exact_gps,
        targetPlaces: 50,
      }).catch(() => [])
    : [];

  const createdOptions = mode === 'DISCOVERY' && places && places.length > 0
    ? buildOptionRecords(places, roomId).map((opt) => ({
        id: opt.id || crypto.randomUUID(),
        roomId,
        name: opt.name,
        source: opt.source || 'GOOGLE_API',
        googlePlaceId: opt.googlePlaceId || null,
        priceLevel: opt.priceLevel ?? null,
      }))
    : [];

  const optimisticHostParticipant = {
    id: String(host_id),
    roomId,
    deviceId: cleanHostDeviceId,
    budgetCap: null,
  };

  // Reserve the PIN durably before publishing it. A collision must never delete a room.
  let dbRoom;
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      dbRoom = await createRoom(host_id, pin, roomTheme, radius, cleanHostDeviceId, roomId, createdOptions, isTest);
      break;
    } catch (err) {
      if (err.code !== 'P2002') throw err;
      pin = generatePin();
    }
  }
  if (!dbRoom) return res.status(503).json({ success: false, error: 'ROOM_CAPACITY', message: 'Please try creating the room again.' });

  // Pre-seed in-memory room caches immediately so GET /rooms/:pin and socket join_lobby respond in 0ms from RAM
  const topicLabel = mode === 'DISCOVERY' ? (theme || 'Places Nearby') : (theme || 'What should we do?');
  roomSummaryCache.set(pin, {
    room: {
      id: roomId,
      pin,
      hostId: String(host_id),
      hostDeviceId: cleanHostDeviceId,
      status: 'CONFIGURING',
      theme: roomTheme,
      radius: typeof radius === 'number' ? radius : null,
    },
    expiresAt: Date.now() + 60000,
  });
  setBoundedRoomCache(pin, {
    room_id: roomId,
    pin,
    status: 'CONFIGURING',
    theme: roomTheme,
    topic: topicLabel,
    mode: mode === 'CUSTOM' ? 'CUSTOM' : 'DISCOVERY',
    participants: [publicParticipant(optimisticHostParticipant)],
    options: createdOptions,
  });

  if (mode === 'DISCOVERY') {
    dispatchActivityNotification('room_created', {
      pin, topic: topicLabel, mode: 'DISCOVERY', optionCount: createdOptions.length, initialTableCount: 6, hostId: host_id, deviceId: device_id,
    }).catch(() => {});

    return res.status(201).json({
      room_id: roomId, pin, host_token: issueHostToken(pin, host_id),
      status: 'CONFIGURING', theme: roomTheme, topic: topicLabel, mode: 'DISCOVERY', options: createdOptions,
    });
  }

  dispatchActivityNotification('room_created', {
    pin, topic: topicLabel, mode: 'CUSTOM', optionCount: 0, hostId: host_id, deviceId: device_id,
  }).catch(() => {});

  return res.status(201).json({
    room_id: roomId, pin, host_token: issueHostToken(pin, host_id),
    status: 'CONFIGURING', theme: roomTheme, topic: topicLabel, mode: 'CUSTOM', options: [],
  });
};

const getRoom = async (req, res) => {
  try {
    const { pin } = req.params;

    const room = await getRoomByPin(pin);
    if (room.runtimeState?.closed) return res.status(410).json({ success: false, error: 'ROOM_CLOSED', message: 'This room has expired. Please create a new pick.' });

    const isCustom = Boolean(room.theme && room.theme.startsWith('custom'));
    const rawThemeTopic = room.theme ? room.theme.replace(/^custom:/, '').trim() : '';
    const resolvedTopic = isCustom
      ? (rawThemeTopic && rawThemeTopic !== 'custom' && rawThemeTopic !== 'poll' ? rawThemeTopic : 'What should we do?')
      : (room.theme || 'Places Nearby');

    const activeSession = activeVotingSessions?.get(pin);
    const optionsToReturn = (activeSession && Array.isArray(activeSession.options) && activeSession.options.length > 0)
      ? activeSession.options
      : (Array.isArray(room.options) ? room.options.slice(0, 12) : []);

    const payload = {
      room_id: room.id,
      pin: room.pin,
      status: activeSession ? (activeSession.isResolved ? 'RESOLVED' : 'VOTING') : room.status,
      theme: room.theme,
      topic: resolvedTopic,
      mode: isCustom ? 'CUSTOM' : 'DISCOVERY',
      participants: room.participants.map(publicParticipant),
      options: optionsToReturn,
    };

    setBoundedRoomCache(pin, payload);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(404).json({
      success: false,
      error: 'ROOM_NOT_FOUND',
      message: 'No active room found with this PIN.',
    });
  }
};

const updateConfig = async (req, res) => {
  const { id } = req.params;
  const { host_id, host_token, pin, theme, radius, status } = req.body || {};

  if (!id || !pin || !host_id) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_CREDENTIALS',
      message: 'id, pin, host_id, and host_token are required.',
    });
  }

  const room = await getRoomByPin(pin).catch(() => null);
  if (!room || room.id !== id) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Authorization mismatch for requested room identifier.',
    });
  }

  if (!authenticatedHost(room, req.body, activeLobbies.get(pin))) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Valid host authorization is required to update room configuration.',
    });
  }

  if (activeVotingSessions.has(pin) || room.status === 'RESOLVED') {
    return res.status(409).json({ success: false, error: 'CONFIG_LOCKED', message: 'Room settings are locked after voting starts.' });
  }
  const safeUpdateData = {};
  if (typeof theme === 'string') safeUpdateData.theme = theme.slice(0, 100);
  if (typeof radius === 'number') safeUpdateData.radius = Math.max(500, Math.min(50000, Math.round(radius)));
  if (['CONFIGURING', 'SUGGESTING'].includes(status)) {
    safeUpdateData.status = status;
  }

  const updatedRoom = await updateRoomConfig(id, safeUpdateData);
  if (pin) invalidateRoomCache(pin);

  return res.status(200).json({
    success: true,
    room_id: updatedRoom.id,
    status: updatedRoom.status,
    message: 'Room configuration updated successfully.',
  });
};

// Lilia: handle Step Zero budget constraint submission
const submitConstraints = async (req, res) => {
  const { pin } = req.params;
  const { participant_id, device_id, max_price_level } = req.body || {};

  // Lilia: validate the Step Zero budget range
  if (
    !participant_id ||
    !Number.isInteger(max_price_level) ||
    max_price_level < 1 ||
    max_price_level > 4
  ) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_CONSTRAINT',
      message: 'participant_id and max_price_level (1-4) are required.',
    });
  }

  // Lilia: verify that the participant belongs to this room (by participant_id or same-room device_id)
  const room = await getRoomByPin(pin);

  const matchedParticipant = authenticatedParticipant(room, participant_id, device_id);

  if (!matchedParticipant) return forbidden(res);

  // Lilia: save the participant's budget limit (and backfill deviceId if missing) without destructively deleting room options
  await updateParticipantBudget(matchedParticipant.id, max_price_level, device_id);
  if (device_id && !room.hostDeviceId && room.hostId === matchedParticipant.id) {
    await updateRoomConfig(room.id, { hostDeviceId: String(device_id).trim().slice(0, 64) }).catch(() => {});
  }
  invalidateRoomCache(pin);

  return res.status(200).json({
    success: true,
    message: 'Constraint locked.',
  });
};



// Lilia: save a participant's batched rankings and broadcast live vote progress
const submitVotes = async (req, res) => {
  const { pin } = req.params;
  const { participant_id, device_id, rankings } = req.body || {};

  // Lilia: validate the batched rankings payload
  if (
    !participant_id ||
    !Array.isArray(rankings) ||
    rankings.length === 0 ||
    rankings.length > 50
  ) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_VOTES',
      message: 'participant_id and a valid rankings array (1-50 items) are required.',
    });
  }

  // Validate every ranking before writing anything to the database
  const validScores = new Set([1, -1, -100, 2, 0]);

  const rankingsAreValid = rankings.every(
    (ranking) =>
      ranking &&
      typeof ranking.option_id === 'string' &&
      validScores.has(ranking.score)
  );

  if (!rankingsAreValid) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_VOTES',
      message: 'Each ranking must contain option_id and a valid score.',
    });
  }

  // Authenticate the exact participant with its private device credential.
  const room = await getRoomByPin(pin);
  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'ROOM_NOT_FOUND',
      message: 'No active room found with this PIN.',
    });
  }

  const matchedParticipant = authenticatedParticipant(room, participant_id, device_id);
  if (!matchedParticipant) return forbidden(res);
  const session = activeVotingSessions.get(pin);
  if (session?.eligibleParticipantIds && !session.eligibleParticipantIds.has(participant_id)) return forbidden(res);
  if (!session || !session.options?.length) return res.status(409).json({ success: false, error: 'VOTING_NOT_STARTED' });
  let sanitized;
  try { sanitized = sanitizeBallot(rankings, session.options.map(o => o.id)); }
  catch (err) { return res.status(400).json({ success: false, error: err.code, message: err.message }); }

  const effectiveParticipantId = matchedParticipant.id;
  if (device_id && !matchedParticipant.deviceId) {
    await updateParticipantBudget(effectiveParticipantId, matchedParticipant.budgetCap, device_id).catch(() => {});
  }
  if (device_id && !room.hostDeviceId && room.hostId === effectiveParticipantId) {
    await updateRoomConfig(room.id, { hostDeviceId: String(device_id).trim().slice(0, 64) }).catch(() => {});
  }

  const accepted = await recordSessionBallot(session, effectiveParticipantId,
    Array.from(sanitized, ([option_id, score]) => ({ option_id, score })));
  if (accepted) {
    const io = req.app.get('io');
    io.to(pin).emit('vote_progress', { pin, voted_participants: session.submissions.size, total_participants: session.expectedCount,
      voted_participant_ids: Array.from(session.submissions.keys()) });
    if (session.submissions.size >= session.expectedCount) {
      await require('../sockets/socketSessionStore').resolveAndBroadcastWinner(io, pin);
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Votes recorded safely.',
    ...(session.isResolved ? require('../sockets/socketSessionStore').buildResolvedPayload(pin, session) : {}),
  });
};

// Sprint 4: finalize voting using worker_thread to prevent event loop blocking
const finalizeVoting = async (req, res) => {
  const { pin } = req.params;
  const room = await getRoomWithVotesByPin(pin);
  if (!authenticatedHost(room, req.body, activeLobbies.get(pin))) return forbidden(res);
  const session = activeVotingSessions.get(pin);
  if (session) {
    const { resolveAndBroadcastWinner } = require('../sockets/socketSessionStore');
    if (!session.submissions.size) return res.status(409).json({ success: false, error: 'NO_BALLOTS' });
    await resolveAndBroadcastWinner(req.app.get('io'), pin);
    return res.json({ success: true, winner_option_id: session.winner?.id });
  }

  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'ROOM_NOT_FOUND',
      message: 'No active room found with this PIN.',
    });
  }

  const submissions = room.participants.map(p => ({
    participant_id: p.id,
    votes: (p.votes || []).map(vote => ({
      option_id: vote.optionId,
      score: vote.score
    }))
  }));

  try {
    const winningOptionId = calculateSchulzeWinner(submissions);

    if (!winningOptionId) {
      return res.status(400).json({
        success: false,
        error: 'NO_VALID_WINNER',
        message: 'Could not resolve a winning option from submissions.',
      });
    }

    let io = null;
    try {
      io = req.app.get('io') || getIO();
    } catch (e) {
      console.warn('[roomController] finalizeVoting io notice:', e.message);
    }

    const winningOption = room.options.find(o => o.id === winningOptionId) || {
      id: winningOptionId,
      name: 'Consensus Winner',
      price_level: 2,
      distance_km: null
    };

    if (io) {
      io.to(pin).emit('MATCH_FOUND', { winningOptionId, winning_option: winningOption, winner: winningOption });
      io.to(pin).emit('winner_announced', { pin, winning_option: winningOption, winningOptionId, winner: winningOption });
      io.to(pin).emit('consensus_reached', { pin, winning_option: winningOption, winningOptionId, winner: winningOption });
    }

    dispatchActivityNotification('decision_reached', {
      pin, winnerName: winningOption.name, winnerCategory: winningOption.category || 'Group Choice',
      winnerAddress: winningOption.address || '', voterCount: room.participants?.length || 1, matchScore: 96,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      winner_option_id: winningOptionId,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};


// Afina: process end-of-event venue feedback and trigger analytics recalculation
const submitFeedback = async (req, res) => {
    const { pin } = req.params;
    const { participant_id, device_id, option_id, option_name, satisfaction_score, price_accuracy_score, comment } = req.body || {};

    if (!participant_id || !option_id || satisfaction_score === undefined || price_accuracy_score === undefined) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_FIELDS',
            message: 'participant_id, option_id, and both scores are required.'
        });
    }

    // Strict boundary check for 1-5 star ratings
    if (
        !Number.isInteger(satisfaction_score) || !Number.isInteger(price_accuracy_score) ||
        satisfaction_score < 1 || satisfaction_score > 5 ||
        price_accuracy_score < 1 || price_accuracy_score > 5
    ) {
        return res.status(400).json({
            success: false,
            error: 'INVALID_CONSTRAINT',
            message: 'Scores must be integers between 1 and 5.'
        });
    }

    const room = await getRoomByPin(pin);
    const participant = authenticatedParticipant(room, participant_id, device_id);
    if (!participant) return forbidden(res);
    const session = activeVotingSessions.get(pin);
    const validOption = room.options.some(o => o.id === option_id) || session?.options?.some(o => o.id === option_id);
    if (!validOption || (room.status !== 'RESOLVED' && !session?.isResolved)) {
      return res.status(409).json({ success: false, error: 'INVALID_FEEDBACK_OPTION' });
    }
    const result = await submitVenueFeedback(participant_id, option_id, satisfaction_score, price_accuracy_score, {
        pin,
        device_id,
        option_name,
        comment,
    });

    dispatchActivityNotification('feedback_submitted', {
        pin,
        venueName: result?.option?.name || option_name || 'Consensus Winner',
        satisfactionScore: satisfaction_score,
        priceAccuracyScore: price_accuracy_score,
        comment,
        deviceId: device_id || result?.participant?.deviceId,
    }).catch(() => {});

    return res.status(200).json({ success: true, feedback_id: result?.feedback?.id });
};

// Fetch 10 more locations when a room approaches the end of its 30-venue pool
const getMorePlaces = async (req, res) => {
  try {
    const { pin } = req.params;
    const { latitude, longitude, radius = 5000, is_exact_gps = false } = req.body || {};

    const room = await getRoomByPin(pin);
    if (!room || (room.theme && room.theme.startsWith('custom'))) {
      return res.status(400).json({ success: false, error: 'INVALID_ROOM', message: 'Room not eligible for venue discovery.' });
    }

    if (!authenticatedHost(room, req.body, activeLobbies.get(pin))) return forbidden(res);
    const theme = room.theme || 'restaurant';
    const newPlaces = await expandRoomVenues({
      room,
      latitude,
      longitude,
      radius,
      is_exact_gps,
      targetCount: 10,
    });

    if (newPlaces.length === 0) {
      return res.status(200).json({ success: true, count: 0, options: [] });
    }

    const optionsData = buildOptionRecords(newPlaces, room.id);
    const created = await createOptionsBulk(optionsData);
    invalidateRoomCache(pin);

    // Broadcast expanded options to active room sockets
    const io = req.app?.get('io');
    if (io) {
      io.to(pin).emit('options_expanded', {
        pin,
        newOptions: created,
        totalOptionsCount: (room.options || []).length + created.length,
      });
    }

    return res.status(200).json({
      success: true,
      count: created.length,
      options: created,
    });
  } catch (err) {
    console.error('[RoomController] getMorePlaces error:', err.message);
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
};

// Ephemeral Crowd-Sourced Self-Healing: Instant closure flag by users
const reportClosedVenueHandler = async (req, res) => {
  const { name, address, lat, lng, reason } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: 'Venue name is required' });
  }

  const result = reportClosedVenue({ name, address, lat, lng, reason });
  if (!result.success) return res.status(400).json(result);
  return res.status(200).json({
    success: true,
    message: 'Venue report submitted for review.',
    venue: result.venue,
  });
};

const getSession = async (req, res) => {
  let deviceId = req.query.device_id || req.headers['x-device-id'];
  if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
    deviceId = crypto.randomUUID();
  } else {
    deviceId = deviceId.trim().slice(0, 64);
  }
  return res.status(200).json({
    success: true,
    deviceId,
  });
};

module.exports = {
  createNewRoom,
  getRoom,
  getSession,
  getMorePlaces,
  updateConfig,
  submitConstraints,
  finalizeVoting,
  submitVotes,
  submitFeedback,
  reportClosedVenueHandler,
};