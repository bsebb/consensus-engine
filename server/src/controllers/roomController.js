// Lilia: import Step Zero budget and pruning helpers
const path = require('path');
const { Worker } = require('worker_threads');
const {
  createRoom,
  getRoomByPin,
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

// Lilia: access Socket.io for live vote progress updates
const { getIO } = require('../utils/socket');
const { generatePin, issueHostToken, verifyHostToken } = require('../utils/hostAuth');
const { searchRestaurants, fetchFoursquarePlaces } = require('../utils/foursquarePlaces');
const { fetchGooglePlaces } = require('../utils/googlePlaces');
const { fetchGeoapifyPlaces } = require('../utils/geoapifyPlaces');
const { resolveRegionalFallback } = require('../utils/fallbackVenues');
const { reportClosedVenue, filterReportedVenues } = require('../utils/reportedVenues');

// Helper to execute Schulze worker thread off the main event loop
const runSchulzeWorker = (submissions) => {
  return new Promise((resolve, reject) => {
    const workerPath = path.resolve(__dirname, '../workers/schulzeWorker.js');
    const worker = new Worker(workerPath, {
      workerData: { submissions },
    });

    worker.on('message', (message) => {
      if (message.success) {
        resolve(message.winner);
      } else {
        reject(new Error(message.error));
      }
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker thread stopped with exit code ${code}`));
      }
    });
  });
};

const createNewRoom = async (req, res) => {
  // Sprint 2: Added mode, theme, radius, latitude, longitude, and is_exact_gps
  const {
    host_id,
    mode = 'DISCOVERY',
    theme = 'restaurant',
    radius = 5000,
    latitude,
    longitude,
    is_exact_gps = false,
    deck_size = 6,
    deckSize,
  } = req.body;

  if (!host_id) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_HOST_ID',
      message: 'host_id is required to create a room.',
    });
  }

  const pin = generatePin();
  const roomTheme = mode === 'CUSTOM' ? `custom:${theme || 'poll'}` : theme;
  const room = await createRoom(host_id, pin, roomTheme, radius);

  // Fetch places from Google Places (New) or fallback spatial engine and save to DB
  if (mode === 'DISCOVERY') {
    const targetPlaces = 30; // One query pre-caches up to 30 locations for the room
    const hasGoogleKey = Boolean(
      (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim()
    );

    let places = [];
    if (hasGoogleKey) {
      try {
        places = await fetchGooglePlaces({
          theme,
          latitude,
          longitude,
          radius,
          targetPlaces,
          isExactGps: is_exact_gps,
        });
      } catch (err) {
        console.warn('[Google Places Error, falling back to spatial engine]:', err.message);
      }
    }

    // Zero-Cost Open Core: Query Geoapify (3,000 req/day free, no credit card) if configured
    if (!places || places.length === 0) {
      try {
        places = await fetchGeoapifyPlaces({
          theme,
          latitude,
          longitude,
          radius,
          targetPlaces,
          isExactGps: is_exact_gps,
        });
      } catch (err) {
        console.warn('[Geoapify Places Error, falling back]:', err.message);
      }
    }

    if (!places || places.length === 0) {
      const fetchFn = searchRestaurants || fetchFoursquarePlaces;
      places = await fetchFn({
        theme,
        latitude,
        longitude,
        radius,
        is_exact_gps,
        targetPlaces,
      });
    }

    // Ephemeral Crowd-Sourced Self-Healing: Purge reported closed spots (e.g. Casa Mare)
    places = filterReportedVenues(places || []);

    if (!places || places.length < targetPlaces) {
      try {
        const fallbacks = await resolveRegionalFallback(
          theme,
          latitude,
          longitude,
          is_exact_gps,
          targetPlaces
        );
        const existingNames = new Set((places || []).map((p) => (p.name || '').toLowerCase().trim()));
        const merged = [...(places || [])];
        for (const fb of (fallbacks || [])) {
          if (merged.length >= targetPlaces) break;
          const fbNorm = (fb.name || '').toLowerCase().trim();
          if (fbNorm && !existingNames.has(fbNorm)) {
            existingNames.add(fbNorm);
            merged.push(fb);
          }
        }
        places = merged;
      } catch (fbErr) {
        console.warn('[RoomController] Regional fallback backfill notice:', fbErr.message);
      }
    }

    let createdOptions = [];
    if (places && places.length > 0) {
      const optionsData = places.map((place) => {
        const placeId = place.fsq_place_id || place.fsq_id || 'fsq_live';
        const distKm = place.distance_km != null ? String(place.distance_km) : '';
        const addr = String(place.address || '').replace(/\|/g, ' ');
        const catLabel = String(place.category || '').replace(/\|/g, ' ');
        const coordPair = place.lat != null && place.lng != null ? `${place.lat},${place.lng}` : '';
        const rawPhoto = typeof place.photo_url === 'string'
          ? place.photo_url
          : (place.photo_url && typeof place.photo_url.photo_url === 'string' ? place.photo_url.photo_url : '');
        const photoUrl = String(rawPhoto || '').replace(/\|/g, '');
        const compositeId = `${placeId}|${distKm}|${addr}|${catLabel}|${coordPair}|${photoUrl}`;

        return {
          roomId: room.id,
          name: place.name,
          source: "GOOGLE_API",
          googlePlaceId: compositeId,
          priceLevel: place.priceLevel ?? 2,
        };
      });
      createdOptions = await createOptionsBulk(optionsData);
    }

    return res.status(201).json({
      room_id: room.id,
      pin: room.pin,
      host_token: issueHostToken(room.pin, host_id),
      status: room.status,
      theme: roomTheme,
      topic: theme || 'Places Nearby',
      mode: 'DISCOVERY',
      options: createdOptions,
    });
  }

  return res.status(201).json({
    room_id: room.id,
    pin: room.pin,
    host_token: issueHostToken(room.pin, host_id),
    status: room.status,
    theme: roomTheme,
    topic: theme || 'What should we do?',
    mode: 'CUSTOM',
    options: [],
  });
};

// Short in-memory cache (15s TTL) for room lookups to reduce PostgreSQL connection pressure
const roomResponseCache = new Map();

function invalidateRoomCache(pin) {
  if (pin) roomResponseCache.delete(String(pin));
}

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

    roomResponseCache.set(pin, { payload, expiresAt: Date.now() + 15000 });
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
  const { participant_id, max_price_level } = req.body;

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

  // Lilia: verify that the participant belongs to this room
  const room = await getRoomByPin(pin);

  const participantExists = room.participants.some(
    (participant) => participant.id === participant_id
  );

  if (!participantExists) {
    return res.status(404).json({
      success: false,
      error: 'PARTICIPANT_NOT_FOUND',
      message: 'Participant does not belong to this room.',
    });
  }

  // Lilia: save the participant's budget limit
  await updateParticipantBudget(participant_id, max_price_level);

  // Lilia: find the strictest budget limit among all participants
  const updatedRoom = await getRoomByPin(pin);

  const budgetLimits = updatedRoom.participants
    .map((participant) => participant.budgetCap)
    .filter((budget) => budget !== null);

  const groupMaxPriceLevel = Math.min(...budgetLimits);

  // Lilia: remove restaurants that exceed the group's strictest budget
  await pruneOptionsByBudget(updatedRoom.id, groupMaxPriceLevel);

  return res.status(200).json({
    success: true,
    message: 'Constraint locked.',
  });
};



// Lilia: save a participant's batched rankings and broadcast live vote progress
const submitVotes = async (req, res) => {
  const { pin } = req.params;
  const { participant_id, rankings } = req.body;

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

  // Lilia: validate every ranking before writing anything to the database
  const validScores = new Set([1, -1, -100]);

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

  // Lilia: verify that the participant belongs to this room
  const room = await getRoomByPin(pin);

  const participantExists = room.participants.some(
    (participant) => participant.id === participant_id
  );

  if (!participantExists) {
    return res.status(404).json({
      success: false,
      error: 'PARTICIPANT_NOT_FOUND',
      message: 'Participant does not belong to this room.',
    });
  }

  // Lilia: make sure every submitted option belongs to this room
  const roomOptionIds = new Set(
    room.options.map((option) => option.id)
  );

  // Ensure options exist or are created dynamically if custom
  for (const ranking of rankings) {
    if (!roomOptionIds.has(ranking.option_id)) {
      try {
        const newOpt = await createOption(room.id, ranking.name || `Option ${ranking.option_id}`, 'USER_CUSTOM', null, null);
        roomOptionIds.add(newOpt.id);
      } catch (optErr) {
        console.warn('[roomController] Auto-create option notice:', optErr.message);
      }
    }
  }

  // Lilia: save all submitted rankings in a single bulk operation
  const validRankings = rankings
    .filter((r) => roomOptionIds.has(r.option_id))
    .map((r) => ({
      participantId: participant_id,
      optionId: r.option_id,
      score: r.score,
    }));

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

  // Lilia: count unique participants who have completed voting
  let votedParticipants = 1;
  try {
    votedParticipants = await countVotedParticipants(room.id);
  } catch (cntErr) {
    console.warn('[roomController] countVotedParticipants notice:', cntErr.message);
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
  const room = await getRoomByPin(pin);

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
    const winningOptionId = await runSchulzeWorker(submissions);

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
    const { participant_id, option_id, satisfaction_score, price_accuracy_score } = req.body;

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

    await submitVenueFeedback(participant_id, option_id, satisfaction_score, price_accuracy_score);

    return res.status(200).json({ success: true });
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
    const existingOptions = room.options || [];
    const existingNames = new Set(existingOptions.map((o) => (o.name || '').toLowerCase().trim()));

    // Resolve up to 40 candidates and pick 10 not already in the room
    const candidatePlaces = await resolveRegionalFallback(theme, latitude, longitude, is_exact_gps, 40);
    const newPlaces = (candidatePlaces || []).filter((p) => {
      const nameNorm = (p.name || '').toLowerCase().trim();
      return nameNorm && !existingNames.has(nameNorm);
    }).slice(0, 10);

    if (newPlaces.length === 0) {
      return res.status(200).json({ success: true, count: 0, options: [] });
    }

    const optionsData = newPlaces.map((place) => {
      const placeId = place.fsq_place_id || place.fsq_id || 'fsq_live';
      const distKm = place.distance_km != null ? String(place.distance_km) : '';
      const addr = String(place.address || '').replace(/\|/g, ' ');
      const catLabel = String(place.category || '').replace(/\|/g, ' ');
      const coordPair = place.lat != null && place.lng != null ? `${place.lat},${place.lng}` : '';
      const rawPhoto = typeof place.photo_url === 'string'
        ? place.photo_url
        : (place.photo_url && typeof place.photo_url.photo_url === 'string' ? place.photo_url.photo_url : '');
      const photoUrl = String(rawPhoto || '').replace(/\|/g, '');
      const compositeId = `${placeId}|${distKm}|${addr}|${catLabel}|${coordPair}|${photoUrl}`;

      return {
        roomId: room.id,
        name: place.name,
        source: 'GOOGLE_API',
        googlePlaceId: compositeId,
        priceLevel: place.priceLevel ?? 2,
      };
    });

    const created = await createOptionsBulk(optionsData);
    invalidateRoomCache(pin);

    // Broadcast expanded options to active room sockets
    const io = req.app?.get('io');
    if (io) {
      io.to(pin).emit('options_expanded', {
        pin,
        newOptions: created,
        totalOptionsCount: existingOptions.length + created.length,
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
  //Lilia: export Step Zero constraints handler
  submitConstraints,
  //export voting finalizer
  finalizeVoting,
  //export batched voting handler
  submitVotes,
  // Afina: export feedback handler
  submitFeedback,
  reportClosedVenueHandler,
};