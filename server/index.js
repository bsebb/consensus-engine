const express = require('express')
const { createRoom, getRoomByPin } = require('./db/helpers');

const app = express();

app.use(express.json()); // bodyparser json stuff

// quick function for 4 digit pin 
function generatePin(){
    return Math.floor(1000 + Math.random() * 9000).toString()
}

// POST /api/v1/rooms
app.post('/api/v1/rooms', async (req, res) => {
  try {
    const { host_id } = req.body;

    // validation check
    if(!host_id){
      return res.status(400).json({
        success: false,
        error: 'MISSING_HOST_ID',
        message: 'host_id is required to create a room.',
      })
    }

    const pin = generatePin();
    const room = await createRoom(host_id, pin)

    // send back data according to specs
    return res.status(201).json({
      room_id: room.id,
      pin: room.pin,
      status: room.status,
    });

  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to create room.',
    });
  }
});

app.get('/api/v1/rooms/:pin', async (req, res) => {
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
    if (error.message === 'Room not found') {
      return res.status(404).json({
        success: false,
        error: 'ROOM_NOT_FOUND',
        message: 'No active room found with this PIN.',
      });
    }
    console.error('Error fetching room:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to retrieve room.',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
});