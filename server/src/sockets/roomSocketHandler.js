const { registerLobbySocketHandlers } = require('./lobbySocketHandler');
const { registerVotingSocketHandlers } = require('./votingSocketHandler');
const { withRoomState, afterCommit, coordinatedIO } = require('../state/roomCoordinator');

function registerRoomSocketHandlers(io, socket, store) {
  const sharedIO = coordinatedIO(io);
  const facade = new Proxy(socket, {
    get(target, property) {
      if (property === 'on') return (event, handler) => {
        target.on(event, async (...args) => {
          if (store.shuttingDown) return;
          const pin = args[0]?.pin || target.data.pin;
          const previousData = { ...target.data };
          const previousRooms = new Set(target.rooms);
          try { await withRoomState(pin, store, () => handler(...args)); }
          catch (error) {
            target.data = previousData;
            for (const room of target.rooms) if (!previousRooms.has(room)) target.leave(room);
            for (const room of previousRooms) if (!target.rooms.has(room) && target.connected) await target.join(room);
            console.error(`[Room state] ${event} failed: ${error.code || error.name}`);
            if (target.connected) target.emit(event.startsWith('submit') ? 'ballot_error' : 'room_error', {
              code: 'STATE_UNAVAILABLE', message: 'Your change was not saved. Please reconnect or try again.',
            });
          }
        });
        return facade;
      };
      if (property === 'emit') return (...args) => { afterCommit(() => target.emit(...args)); return true; };
      const value = target[property];
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, property, value) { target[property] = value; return true; },
  });
  registerLobbySocketHandlers(sharedIO, facade, store);
  registerVotingSocketHandlers(sharedIO, facade, store);
}
module.exports = { registerRoomSocketHandlers };
