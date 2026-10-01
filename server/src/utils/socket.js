//Lilia: store the shared Socket.io instance so controllers can broadcast room updates

let io = null;

const setIO = (socketIO) => {
  io = socketIO;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized.');
  }

  return io;
};

module.exports = {
  setIO,
  getIO,
};