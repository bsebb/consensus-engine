// Lilia: import Step Zero budget and pruning helpers
const {
  createRoom,
  getRoomByPin,
  updateRoomConfig,
  updateParticipantBudget,
  pruneOptionsByBudget,
  createOption // Added for Sprint 2 options saving
} = require('../db/helpers');

// Added for Sprint 2 Foursquare Integration
const { searchRestaurants, fetchFoursquarePlaces } = require('../utils/foursquarePlaces');

const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

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
    // Support either exported function name from foursquarePlaces.js
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
        "FOURSQUARE", // Keep as GOOGLE_API to satisfy Prisma enum constraints
        place.fsq_place_id || place.fsq_id,
        place.priceLevel ?? null // Pass price level (1-4) for Lilia's budget pruning
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
  const { pin } = req.params;
  const room = await getRoomByPin(pin);

  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'ROOM_NOT_FOUND',
      message: 'No active room found with this PIN.',
    });
  }

  return res.status(200).json({
    room_id: room.id,
    pin: room.pin,
    status: room.status,
    participants: room.participants,
    options: room.options,
  });
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

module.exports = {
  createNewRoom,
  getRoom,
  updateConfig,
  // Lilia: export Step Zero constraints handler
  submitConstraints,
};