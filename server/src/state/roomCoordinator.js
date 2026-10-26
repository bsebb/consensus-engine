const { rootPrisma } = require('../../db/prismaClient');
const { roomTransaction, afterCommit } = require('./transactionContext');

const queues = new Map();
const lobbyFields = ['hostId', 'mode', 'topic', 'groupSize', 'visiblePlacesCount', 'createdAt', 'lastActivityAt', 'closedAt'];
const sessionFields = ['pin', 'roomId', 'options', 'expectedCount', 'isResolved', 'winner', 'hostId', 'topic', 'mode', 'arenaMode', 'createdAt', 'ranking', 'rankingIndex', 'status', 'support', 'vetoCount', 'tieBroken', 'allVetoed', 'supportText', 'matchScore', 'pairwise', 'tally', 'approvalCount', 'totalVoted', 'resolvedAt'];
const pick = (source, keys) => Object.fromEntries(keys.filter(k => source[k] !== undefined).map(k => [k, source[k]]));

function serialize(store, pin) {
  const lobby = store.activeLobbies.get(pin);
  const session = store.activeVotingSessions.get(pin);
  return {
    schemaVersion: 1,
    lobby: lobby ? {
      ...pick(lobby, lobbyFields), participants: [...lobby.values()], suggestions: lobby.suggestions || [],
      suggestionMeta: [...(lobby.suggestionMeta || [])],
      removedOptionIds: [...(lobby.removedOptionIds || [])], removedDeviceIds: [...(lobby.removedDeviceIds || [])],
    } : null,
    voting: session ? { ...pick(session, sessionFields), eligibleParticipantIds: [...(session.eligibleParticipantIds || [])], submissions: [...session.submissions] } : null,
    closed: store.closedRooms?.has(pin) || false,
  };
}

function hydrate(store, room) {
  const pin = room.pin;
  const state = room.runtimeState;
  store.activeLobbies.delete(pin); store.activeVotingSessions.delete(pin);
  store.roomSummaryCache.set(pin, { room: { ...room, runtimeState: undefined }, expiresAt: Date.now() + 45000 });
  store.closedRooms?.delete(pin);
  if (state?.closed) store.closedRooms?.add(pin);
  if (!state) return; // Existing rooms can still recover their completed legacy ballots.
  if (state.schemaVersion !== 1) throw new Error('Unsupported room snapshot version');
  if (state.lobby) {
    const data = state.lobby;
    const lobby = new Map(data.participants.map(p => [p.id, p]));
    Object.assign(lobby, pick(data, lobbyFields));
    lobby.suggestions = data.suggestions;
    lobby.suggestionMeta = new Map(data.suggestionMeta);
    lobby.removedOptionIds = new Set(data.removedOptionIds);
    lobby.removedDeviceIds = new Set(data.removedDeviceIds);
    lobby.persistedParticipants = new Set(lobby.keys());
    lobby.deviceToParticipantId = new Map([...lobby.values()].filter(p => p.deviceId).map(p => [p.deviceId, p.id]));
    store.activeLobbies.set(pin, lobby);
  }
  if (state.voting) {
    const data = state.voting;
    store.activeVotingSessions.set(pin, {
      ...data, isResolving: false, submissions: new Map(data.submissions),
      eligibleParticipantIds: new Set(data.eligibleParticipantIds),
    });
  }
}

async function withRoomState(pin, store, work) {
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return work();
  const current = roomTransaction.getStore();
  if (current && !current.finished) {
    if (current.pin !== pin) throw new Error('Cross-room nested transaction is not permitted');
    return work();
  }
  // Avoid stale local objects while another request for this room holds a DB lock.
  const previous = queues.get(pin) || Promise.resolve();
  const operation = previous.catch(() => {}).then(async () => {
    let context;
    try {
      const result = await rootPrisma.$transaction(async tx => {
        const rows = await tx.$queryRaw`SELECT id FROM rooms WHERE pin = ${pin} FOR UPDATE`;
        if (!rows.length) {
          store.activeLobbies.delete(pin); store.activeVotingSessions.delete(pin); store.roomSummaryCache.delete(pin);
          context = { tx, pin, effects: [], finished: false };
          return roomTransaction.run(context, work);
        }
        const room = await tx.room.findUnique({ where: { pin } });
        hydrate(store, room);
        context = { tx, pin, effects: [], finished: false };
        return roomTransaction.run(context, async () => {
          const response = await work();
          await tx.$queryRaw`SELECT 1`; // An aborted SQL transaction must never publish success.
          // Persist all gameplay changes in the same transaction as the ballots/options.
          const snapshot = JSON.parse(JSON.stringify(serialize(store, pin)));
          if (JSON.stringify(snapshot) !== JSON.stringify(room.runtimeState)) {
            await tx.room.update({ where: { id: room.id }, data: { runtimeState: snapshot } });
          }
          return response;
        });
      }, { maxWait: 10000, timeout: 15000 });
      if (context) {
        context.finished = true;
        for (const effect of context.effects) {
          try { await effect(); } catch (error) { console.error('[Room delivery]', error.code || error.name); }
        }
      }
      return result;
    } catch (error) {
      if (context) context.finished = true;
      store.activeLobbies.delete(pin); store.activeVotingSessions.delete(pin); store.roomSummaryCache.delete(pin);
      throw error;
    }
  });
  queues.set(pin, operation);
  try { return await operation; }
  finally { if (queues.get(pin) === operation) queues.delete(pin); }
}

// Only messages are deferred; adapter presence queries must execute immediately.
function coordinatedIO(io) {
  return new Proxy(io, {
    get(target, property) {
      if (property === 'to' || property === 'in') return (...rooms) => {
        const operator = target[property](...rooms);
        return new Proxy(operator, { get(op, key) {
          if (key === 'emit') return (...args) => { afterCommit(() => op.emit(...args)); return true; };
          const value = op[key]; return typeof value === 'function' ? value.bind(op) : value;
        } });
      };
      const value = target[property]; return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

async function drainRoomWork() { while (queues.size) await Promise.allSettled([...queues.values()]); }

module.exports = { drainRoomWork, withRoomState, hydrate, serialize, coordinatedIO, afterCommit };
