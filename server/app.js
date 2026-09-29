require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { searchRestaurants } = require('./utils/foursquarePlaces');
const roomRoutes = require('./routes/roomRoutes');

const app = express();

app.use(express.json());

app.use('/api/v1/rooms', roomRoutes);

app.get('/api/v1/test-foursquare', async (req, res) => {
    try {
        const restaurants = await searchRestaurants({
            latitude: 47.0105,
            longitude: 28.8638,
            radius: 5000,
        });

        res.json({
            success: true,
            count: restaurants.length,
            restaurants,
        });
    } catch (error) {
        console.error('Foursquare error:', error);

        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});



app.use((err, req, res, next) => {
  console.error(`[Error]: ${err.message}`);

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    error: err.name || 'SERVER_ERROR',
    message: err.message || 'An unexpected error occurred.',
  });
});

//Lilia: create an HTTP server so Express and Socket.io use the same port
const httpServer = http.createServer(app);

//Lilia: initialize Socket.io on the existing HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

//Lilia: handle Socket.io room joining for real-time lobby updates
io.on('connection', (socket) => {
  socket.on('join_lobby', async (data) => {
    try {
      const { pin, participant_id, user_name } = data;

      if (!pin || !participant_id) {
        socket.emit('room_error', {
          message: 'pin and participant_id are required.',
        });
        return;
      }

      const room = await require('./db/helpers').getRoomByPin(pin);

      const existingParticipant = room.participants.find(
        (participant) => participant.id === participant_id
      );

      if (!existingParticipant) {
        await require('./db/helpers').createParticipantWithId(
          room.id,
          participant_id
        );
      }

      socket.join(pin);

      socket.data.pin = pin;
      socket.data.participantId = participant_id;
      socket.data.userName = user_name || 'Guest';

      const totalParticipants =
        io.sockets.adapter.rooms.get(pin)?.size || 0;

      //Lilia: notify everyone in this room about the new participant
      io.to(pin).emit('participant_joined', {
        pin,
        participant_id,
        user_name: user_name || 'Guest',
        total_participants: totalParticipants,
      });

      console.log(
        `[Socket] ${user_name || 'Guest'} joined room ${pin}`
      );
    } catch (error) {
      console.error('[Socket] Failed to join room:', error.message);

      socket.emit('room_error', {
        message: 'Failed to join room.',
      });
    }
  });
  //Lilia: start the voting phase for everyone in the room
  socket.on('host_start_voting', async (data) => {
    try {
      const { pin, host_id, options } = data;

      if (!pin || !host_id || !Array.isArray(options)) {
        socket.emit('room_error', {
          message: 'pin, host_id and options are required.',
        });
        return;
      }

      const room = await require('./db/helpers').getRoomByPin(pin);

      //Lilia: only the room host can start the voting phase
      if (room.hostId !== host_id) {
        socket.emit('room_error', {
          message: 'Only the room host can start voting.',
        });
        return;
      }

      //Lilia: broadcast the voting phase to everyone in this Socket.io room
      io.to(pin).emit('voting_started', {
        pin,
        options,
      });

      console.log(
        `[Socket] Voting started in room ${pin} with ${options.length} options`
      );
    } catch (error) {
      console.error(
        '[Socket] Failed to start voting:',
        error.message
      );

      socket.emit('room_error', {
        message: 'Failed to start voting.',
      });
    }
  });
  //Lilia: notify the room when a participant disconnects
  socket.on('disconnect', () => {
    const pin = socket.data.pin;
    const participantId = socket.data.participantId;
    const userName = socket.data.userName || 'Guest';

    if (!pin) {
      return;
    }

    const totalParticipants =
      io.sockets.adapter.rooms.get(pin)?.size || 0;

    //Lilia: send the updated participant count to everyone still in the room
    io.to(pin).emit('participant_left', {
      pin,
      participant_id: participantId,
      user_name: userName,
      total_participants: totalParticipants,
    });

    console.log(
      `[Socket] ${userName} left room ${pin}`
    );
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});