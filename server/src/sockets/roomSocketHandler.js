const { registerLobbySocketHandlers } = require('./lobbySocketHandler');
const { registerVotingSocketHandlers } = require('./votingSocketHandler');

/**
 * Composite socket event router wiring all lobby and voting lifecycle events.
 */
function registerRoomSocketHandlers(io, socket, store) {
  registerLobbySocketHandlers(io, socket, store);
  registerVotingSocketHandlers(io, socket, store);
}

module.exports = {
  registerRoomSocketHandlers,
};
