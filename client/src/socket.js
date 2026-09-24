import { io } from "socket.io-client";

// Lilia: connect the React client to the Socket.io backend
const socket = io("http://localhost:3000");

export default socket;