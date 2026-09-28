const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const roomRoutes = require('./routes/roomRoutes');

const app = express();
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/v1/rooms', roomRoutes);

app.use((err, req, res, next) => {
  console.error(`[Error]: ${err.message}`);
  
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.name || 'SERVER_ERROR',
    message: err.message || 'An unexpected error occurred.',
  });
});

// Lilia: initialize the Socket.io server for real-time communication
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log('A user connected');

  // Lilia: allow participants to join a lobby using its PIN
  socket.on('join_lobby', ({ pin, participant_id }) => {
    socket.join(pin);

    console.log(`Participant ${participant_id} joined lobby ${pin}`);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});