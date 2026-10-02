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
  createVote,
  countVotedParticipants,
  submitVenueFeedback,   //Afina
} = require('../../db/helpers');

// Lilia: access Socket.io for live vote progress updates
const { getIO } = require('../utils/socket');
const { searchRestaurants, fetchFoursquarePlaces } = require('../utils/foursquarePlaces');

const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

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
  // Sprint 2: Added mode, theme, radius, latitude, and longitude
  const {
    host_id,
    mode = 'DISCOVERY',
    theme = 'restaurant',
    radius = 5000,
    latitude,
    longitude
  } = req.body;

  if (!host_id) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_HOST_ID',
      message: 'host_id is required to create a room.',
    });
  }

  const pin = generatePin();
  const room = await createRoom(host_id, pin);

  // Sprint 2 Logic: Fetch Foursquare data and save to DB
  if (mode === 'DISCOVERY') {
    const fetchFn = searchRestaurants || fetchFoursquarePlaces;

    const places = await fetchFn({
      theme,
      latitude,
      longitude,
      radius
    });

    for (const place of places) {
      await createOption(
        room.id,
        place.name,
        "GOOGLE_API",
        place.fsq_place_id || place.fsq_id,
        place.priceLevel ?? null
      );
    }
  }

  return res.status(201).json({
    room_id: room.id,
    pin: room.pin,
    status: room.status,
  });
};

const getRoom = async (req, res) => {
  try {
    const { pin } = req.params;
    const room = await getRoomByPin(pin);

    return res.status(200).json({
      room_id: room.id,
      pin: room.pin,
      status: room.status,
      participants: room.participants,
      options: room.options,
    });
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
  const updateData = req.body;

  const updatedRoom = await updateRoomConfig(id, updateData);

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
    rankings.length === 0
  ) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_VOTES',
      message: 'participant_id and a non-empty rankings array are required.',
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

  const allOptionsBelongToRoom = rankings.every(
    (ranking) => roomOptionIds.has(ranking.option_id)
  );

  if (!allOptionsBelongToRoom) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_OPTION',
      message: 'One or more options do not belong to this room.',
    });
  }

  // Lilia: save all submitted rankings
  for (const ranking of rankings) {
    await createVote(
      participant_id,
      ranking.option_id,
      ranking.score
    );
  }

  // Lilia: count unique participants who have completed voting
  const votedParticipants = await countVotedParticipants(room.id);
  const totalParticipants = room.participants.length;

  // Lilia: broadcast progress only inside this Socket.io room
  const io = getIO();

  io.to(pin).emit('vote_progress', {
    pin,
    voted_participants: votedParticipants,
    total_participants: totalParticipants,
  });

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

    const io = req.app.get('io');

    if (io) {
      io.to(pin).emit('MATCH_FOUND', { winningOptionId });
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


module.exports = {
  createNewRoom,
  getRoom,
  updateConfig,
  //Lilia: export Step Zero constraints handler
  submitConstraints,
  //export voting finalizer
  finalizeVoting,
  //export batched voting handler
  submitVotes,
  // Afina: export feedback handler
  submitFeedback,
};