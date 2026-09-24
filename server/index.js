const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const {
  createRoom,
  getRoomByPin,
  updateRoomConfig,
} = require("./db/helpers");

const app = express();
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json());

// Generate a random 4-digit room PIN
function generatePin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// POST /api/v1/rooms
app.post("/api/v1/rooms", async (req, res) => {
  try {
    const { host_id } = req.body;

    if (!host_id) {
      return res.status(400).json({
        success: false,
        error: "MISSING_HOST_ID",
        message: "host_id is required to create a room.",
      });
    }

    const pin = generatePin();
    const room = await createRoom(host_id, pin);

    return res.status(201).json({
      room_id: room.id,
      pin: room.pin,
      status: room.status,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Failed to create room.",
    });
  }
});

app.get("/api/v1/rooms/:pin", async (req, res) => {
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
    if (error.message === "Room not found") {
      return res.status(404).json({
        success: false,
        error: "ROOM_NOT_FOUND",
        message: "No active room found with this PIN.",
      });
    }

    console.error("Error fetching room:", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Failed to retrieve room.",
    });
  }
});

app.patch("/api/v1/rooms/:id/config", async (req, res) => {
  try {
    const roomId = req.params.id;
    const updateData = req.body;

    const updatedRoom = await updateRoomConfig(roomId, updateData);

    return res.status(200).json({
      room_id: updatedRoom.id,
      status: updatedRoom.status,
      message: "Room configuration updated successfully.",
    });
  } catch (error) {
    console.error("Error updating room:", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Failed to update room.",
    });
  }
});

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

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});