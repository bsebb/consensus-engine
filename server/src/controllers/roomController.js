const crypto = require('crypto');
const {
  createRoom,
  createParticipantWithId,
  registerPendingRoomWrite,
  getRoomByPin,
  getRoomWithVotesByPin,
  updateRoomConfig,
  updateParticipantBudget,
  pruneOptionsByBudget,
  createOption,
  createOptionsBulk,
  createVote,
  createVotesBulk,
  countVotedParticipants,
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
  } = req.body;

  if (!host_id) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_HOST_ID',
      message: 'host_id is required to create a room.',
    });
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
    participants: [optimisticHostParticipant],
    options: createdOptions,
  });

  // Persist room, host participant, and options asynchronously via write-behind promise
  // (Tracked in pendingRoomWrites so any immediate DB query on this roomId/pin awaits completion safely)
  const persistPromise = (async () => {
    try {
      const dbRoom = await createRoom(host_id, pin, roomTheme, radius, cleanHostDeviceId, roomId);
      await createParticipantWithId(dbRoom.id, host_id, null, cleanHostDeviceId, { isNewRoom: true }).catch(() => {});
      if (createdOptions.length > 0) {
        await createOptionsBulk(createdOptions).catch(() => {});
      }
    } catch (err) {
      console.warn('[roomController] Background room persistence notice:', err.message);
    }
  })();
  registerPendingRoomWrite(roomId, pin, persistPromise);

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
    const cached = roomResponseCache.get(pin);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).json(cached.payload);
    }

    const room = await getRoomByPin(pin);

    const isCustom = Boolean(room.theme && room.theme.startsWith('custom'));
    const rawThemeTopic = room.theme ? room.theme.replace(/^custom:/, '').trim() : '';
    const resolvedTopic = isCustom
      ? (rawThemeTopic && rawThemeTopic !== 'custom' && rawThemeTopic !== 'poll' ? rawThemeTopic : 'What should we do?')
      : (room.theme || 'Places Nearby');

    const payload = {
      room_id: room.id,
      pin: room.pin,
      status: room.status,
      theme: room.theme,
      topic: resolvedTopic,
      mode: isCustom ? 'CUSTOM' : 'DISCOVERY',
      participants: room.participants,
      options: room.options,
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

  if (!id || !pin || !host_id || !host_token) {
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

  if (!verifyHostToken(pin, host_id, host_token)) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Valid host authorization is required to update room configuration.',
    });
  }

  const safeUpdateData = {};
  if (typeof theme === 'string') safeUpdateData.theme = theme.slice(0, 100);
  if (typeof radius === 'number') safeUpdateData.radius = Math.max(500, Math.min(50000, Math.round(radius)));
  if (['CONFIGURING', 'SUGGESTING', 'VOTING', 'RESOLVED'].includes(status)) {
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
  const { participant_id, device_id, max_price_level } = req.body;

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

  const matchedParticipant = room.participants.find(
    (participant) =>
      participant.id === participant_id ||
      (device_id && participant.deviceId === device_id)
  );

  if (!matchedParticipant) {
    return res.status(404).json({
      success: false,
      error: 'PARTICIPANT_NOT_FOUND',
      message: 'Participant does not belong to this room.',
    });
  }

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
  const { participant_id, device_id, rankings } = req.body;

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
  const validScores = new Set([1, -1, -100, 2]);

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

  // Verify that the participant belongs to this room (by participant_id or same-room device_id), or self-heal
  const room = await getRoomByPin(pin);
  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'ROOM_NOT_FOUND',
      message: 'No active room found with this PIN.',
    });
  }

  let matchedParticipant = room.participants.find(
    (participant) =>
      participant.id === participant_id ||
      (device_id && participant.deviceId === device_id)
  );

  if (!matchedParticipant) {
    try {
      matchedParticipant = await createParticipantWithId(room.id, participant_id, null, device_id);
      if (matchedParticipant) {
        room.participants.push(matchedParticipant);
        invalidateRoomCache(pin);
      }
    } catch (err) {
      console.warn('[roomController] Auto-create participant on vote notice:', err.message);
    }
  }

  if (!matchedParticipant && room.participants.length > 0) {
    matchedParticipant = room.participants[0];
  }

  if (!matchedParticipant) {
    return res.status(404).json({
      success: false,
      error: 'PARTICIPANT_NOT_FOUND',
      message: 'Participant does not belong to this room.',
    });
  }

  const effectiveParticipantId = matchedParticipant.id;
  if (device_id && !matchedParticipant.deviceId) {
    await updateParticipantBudget(effectiveParticipantId, matchedParticipant.budgetCap, device_id).catch(() => {});
  }
  if (device_id && !room.hostDeviceId && room.hostId === effectiveParticipantId) {
    await updateRoomConfig(room.id, { hostDeviceId: String(device_id).trim().slice(0, 64) }).catch(() => {});
  }

  // Map submitted options to registered room options by ID or name, auto-registering any custom/missing options
  const roomOptionIds = new Set(room.options.map((option) => option.id));
  const optionByName = new Map(room.options.map((option) => [option.name.toLowerCase().trim(), option.id]));
  const missingOptionsToCreate = [];

  const validRankings = rankings
    .map((r) => {
      if (!r) return null;
      let targetId = null;
      const rawName = String(r.name || r.option_id || '')
        .replace(/^custom-\d+-/i, '')
        .trim()
        .slice(0, 120);
      const nameKey = rawName.toLowerCase();

      if (roomOptionIds.has(r.option_id)) {
        targetId = r.option_id;
      } else if (nameKey && optionByName.has(nameKey)) {
        targetId = optionByName.get(nameKey);
      } else if (rawName) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(r.option_id || ''));
        targetId = isUuid ? r.option_id : crypto.randomUUID();
        roomOptionIds.add(targetId);
        optionByName.set(nameKey, targetId);
        missingOptionsToCreate.push({
          id: targetId,
          roomId: room.id,
          name: rawName,
          source: 'USER_CUSTOM',
          googlePlaceId: String(r.option_id || targetId).slice(0, 180),
          priceLevel: 2,
        });
      }
      if (!targetId) return null;
      return {
        participantId: effectiveParticipantId,
        optionId: targetId,
        score: r.score,
      };
    })
    .filter(Boolean);

  if (missingOptionsToCreate.length > 0) {
    await createOptionsBulk(missingOptionsToCreate).catch(() => {});
    invalidateRoomCache(pin);
  }

  if (validRankings.length > 0) {
    try {
      await createVotesBulk(validRankings);
    } catch (bulkErr) {
      console.warn('[roomController] Bulk vote insert notice:', bulkErr.message);
      for (const r of validRankings) {
        await createVote(r.participantId, r.optionId, r.score).catch(() => {});
      }
    }
  }

  // Count unique participants who have completed voting (use O(1) in-memory session when active)
  const activeSession = activeVotingSessions.get(pin);
  let votedParticipants = activeSession && activeSession.submissions.size > 0
    ? activeSession.submissions.size
    : 1;
  if (!activeSession || activeSession.submissions.size === 0) {
    try {
      votedParticipants = await countVotedParticipants(room.id);
    } catch (cntErr) {
      console.warn('[roomController] countVotedParticipants notice:', cntErr.message);
    }
  }
  const totalParticipants = room.participants.length;

  // Lilia: broadcast progress only inside this Socket.io room
  let io = null;
  try {
    io = req.app.get('io') || getIO();
  } catch (ioErr) {
    console.warn('[roomController] Socket instance lookup notice:', ioErr.message);
  }

  if (io) {
    io.to(pin).emit('vote_progress', {
      pin,
      voted_participants: votedParticipants,
      total_participants: totalParticipants,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Votes recorded safely.',
  });
};

// Sprint 4: finalize voting using worker_thread to prevent event loop blocking
const finalizeVoting = async (req, res) => {
  const { pin } = req.params;
  const room = await getRoomWithVotesByPin(pin);

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
    const { participant_id, device_id, option_id, option_name, satisfaction_score, price_accuracy_score, comment } = req.body;

    if (!participant_id || !option_id || satisfaction_score === undefined || price_accuracy_score === undefined) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_FIELDS',
            message: 'participant_id, option_id, and both scores are required.'
        });
    }

    // Strict boundary check for 1-5 star ratings
    if (
        typeof satisfaction_score !== 'number' || typeof price_accuracy_score !== 'number' ||
        satisfaction_score < 1 || satisfaction_score > 5 ||
        price_accuracy_score < 1 || price_accuracy_score > 5
    ) {
        return res.status(400).json({
            success: false,
            error: 'INVALID_CONSTRAINT',
            message: 'Scores must be integers between 1 and 5.'
        });
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
  return res.status(200).json({
    success: true,
    message: 'Venue reported as closed and excluded from future discovery decks.',
    venue: result.venue,
  });
};

module.exports = {
  createNewRoom,
  getRoom,
  getMorePlaces,
  updateConfig,
  submitConstraints,
  finalizeVoting,
  submitVotes,
  submitFeedback,
  reportClosedVenueHandler,
};