const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json());

// Lilia: initialize the Socket.io server for real-time communication
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("A user connected");

  // Lilia: allow participants to join a lobby using its PIN
  socket.on("join_lobby", ({ pin, participant_id }) => {
    socket.join(pin);

    console.log(`Participant ${participant_id} joined lobby ${pin}`);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

const PORT = 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});