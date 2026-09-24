const { createRoom, getRoomByPin, updateRoomConfig } = require('../db/helpers');

const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

const createNewRoom = async (req, res) => {
  const { host_id } = req.body;

  if (!host_id) {
    
    return res.status(400).json({
      success: false,
      error: 'MISSING_HOST_ID',
      message: 'host_id is required to create a room.',
    });
  }

  const pin = generatePin();
  const room = await createRoom(host_id, pin);

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

module.exports = {
  createNewRoom,
  getRoom,
  updateConfig,
};