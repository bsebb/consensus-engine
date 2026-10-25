const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  activeVotingSessions,
  resolveAndBroadcastWinner,
} = require('./socketSessionStore');

test('resolveAndBroadcastWinner computes real tally, approval_count, and total_voted for 3 voters', async () => {
  const pin = 'TEST99';

  const emittedEvents = [];
  const mockIo = {
    to: (targetPin) => ({
      emit: (event, payload) => {
        emittedEvents.push({ targetPin, event, payload });
      },
    }),
  };

  const options = [
    { id: 'opt-1', name: 'Sushi Spot', price_level: 2 },
    { id: 'opt-2', name: 'Burger Joint', price_level: 1 },
    { id: 'opt-3', name: 'Taco Bar', price_level: 1 },
  ];

  // 3 voters:
  // Alice: Likes opt-1, Passes opt-2, Likes opt-3
  // Bob: Likes opt-1, Likes opt-2, Passes opt-3
  // Charlie: Likes opt-1, Passes opt-2, Passes opt-3
  const submissions = new Map([
    [
      'user-alice',
      {
        participant_id: 'user-alice',
        votes: [
          { option_id: 'opt-1', score: 1 },
          { option_id: 'opt-2', score: -1 },
          { option_id: 'opt-3', score: 1 },
        ],
      },
    ],
    [
      'user-bob',
      {
        participant_id: 'user-bob',
        votes: [
          { option_id: 'opt-1', score: 1 },
          { option_id: 'opt-2', score: 1 },
          { option_id: 'opt-3', score: -1 },
        ],
      },
    ],
    [
      'user-charlie',
      {
        participant_id: 'user-charlie',
        votes: [
          { option_id: 'opt-1', score: 1 },
          { option_id: 'opt-2', score: -1 },
          { option_id: 'opt-3', score: -1 },
        ],
      },
    ],
  ]);

  const session = {
    pin,
    options,
    submissions,
    expectedCount: 3,
    isResolved: false,
    winner: null,
  };

  activeVotingSessions.set(pin, session);

  try {
    await resolveAndBroadcastWinner(mockIo, pin);

    assert.equal(session.isResolved, true);
    assert.equal(session.winner.id, 'opt-1');
    assert.equal(session.totalVoted, 3);
    assert.equal(session.approvalCount, 3);

    // Verify tally
    // opt-1: 3 likes, 0 passes
    // opt-2: 1 like, 2 passes
    // opt-3: 1 like, 2 passes
    const tallyOpt1 = session.tally.find((t) => t.option_id === 'opt-1');
    const tallyOpt2 = session.tally.find((t) => t.option_id === 'opt-2');
    const tallyOpt3 = session.tally.find((t) => t.option_id === 'opt-3');

    assert.deepEqual(tallyOpt1, { option_id: 'opt-1', likes: 3, passes: 0 });
    assert.deepEqual(tallyOpt2, { option_id: 'opt-2', likes: 1, passes: 2 });
    assert.deepEqual(tallyOpt3, { option_id: 'opt-3', likes: 1, passes: 2 });

    const winnerEvent = emittedEvents.find((e) => e.event === 'winner_announced');
    assert.ok(winnerEvent, 'winner_announced event must be emitted');
    assert.equal(winnerEvent.payload.total_voted, 3);
    assert.equal(winnerEvent.payload.approval_count, 3);
    assert.deepEqual(winnerEvent.payload.tally, session.tally);
  } finally {
    activeVotingSessions.delete(pin);
  }
});

test('resolveAndBroadcastWinner emits room_error and avoids winner_announced when session has no options', async () => {
  const pin = 'NOOP99';
  const emittedEvents = [];
  const mockIo = {
    to: (targetPin) => ({
      emit: (event, payload) => {
        emittedEvents.push({ targetPin, event, payload });
      },
    }),
  };

  const session = {
    pin,
    options: [],
    submissions: new Map([
      ['u1', { participant_id: 'u1', votes: [{ option_id: 'ghost', score: 1 }] }],
    ]),
    expectedCount: 1,
    isResolved: false,
    winner: null,
  };

  activeVotingSessions.set(pin, session);

  try {
    await resolveAndBroadcastWinner(mockIo, pin);

    const errorEvent = emittedEvents.find((e) => e.event === 'room_error');
    assert.ok(errorEvent, 'room_error event must be emitted');
    assert.equal(errorEvent.payload.code, 'no_options');

    const winnerEvent = emittedEvents.find((e) => e.event === 'winner_announced');
    assert.equal(winnerEvent, undefined, 'winner_announced must not be emitted when no options');
  } finally {
    activeVotingSessions.delete(pin);
  }
});

test('join_lobby enforces per-room deviceId idempotency and reuses existing participant slot across browser switches', async () => {
  const { registerLobbySocketHandlers } = require('./lobbySocketHandler');
  const pin = '8842';
  const activeLobbies = new Map();
  const activeVotingSessions = new Map();
  const disconnectTimeouts = new Map();

  const mockStore = {
    activeLobbies,
    activeVotingSessions,
    disconnectTimeouts,
    getCachedRoomSummary: async () => null, // In-memory lobby test
  };

  // Seed active lobby so join_lobby accepts without DB
  const initialMap = new Map();
  initialMap.suggestions = [];
  initialMap.persistedParticipants = new Set();
  initialMap.deviceToParticipantId = new Map();
  activeLobbies.set(pin, initialMap);

  const roomEmissions = [];
  const mockIo = {
    to: (targetPin) => ({
      emit: (event, payload) => roomEmissions.push({ targetPin, event, payload }),
    }),
  };

  function createMockSocket() {
    const handlers = {};
    const directEmissions = [];
    return {
      data: {},
      join: () => {},
      on: (event, cb) => { handlers[event] = cb; },
      emit: (event, payload) => directEmissions.push({ event, payload }),
      trigger: async (event, data) => handlers[event](data),
      directEmissions,
    };
  }

  // 1. User joins from In-App Browser with participant_id "p-inapp-1" and device_id "nyp_device_abc123"
  const socket1 = createMockSocket();
  registerLobbySocketHandlers(mockIo, socket1, mockStore);
  await socket1.trigger('join_lobby', {
    pin,
    participant_id: 'p-inapp-1',
    device_id: 'nyp_device_abc123',
    user_name: 'Alex',
  });

  const lobby = activeLobbies.get(pin);
  assert.equal(lobby.size, 1, 'Lobby should have 1 participant');
  assert.equal(lobby.get('p-inapp-1').name, 'Alex');

  // 2. Same physical device switches to Safari with a brand new session UUID "p-safari-2", but same device_id "nyp_device_abc123"
  const socket2 = createMockSocket();
  registerLobbySocketHandlers(mockIo, socket2, mockStore);
  await socket2.trigger('join_lobby', {
    pin,
    participant_id: 'p-safari-2',
    device_id: 'nyp_device_abc123',
    user_name: 'Alex (Safari)',
  });

  assert.equal(lobby.size, 1, 'Lobby must reuse existing slot for same deviceId instead of spawning a duplicate');
  assert.equal(lobby.has('p-inapp-1'), true, 'Original participantId slot must be preserved');
  assert.equal(lobby.has('p-safari-2'), false, 'Duplicate participantId must not be added');
  assert.equal(socket2.data.participantId, 'p-inapp-1', 'Socket2 must reconcile to original participantId');

  const lastLobbyState = socket2.directEmissions.find((e) => e.event === 'lobby_state');
  assert.ok(lastLobbyState, 'lobby_state must be emitted to joining socket');
  assert.equal(lastLobbyState.payload.participant_id, 'p-inapp-1');
  assert.equal(lastLobbyState.payload.claimed_participant_id, 'p-safari-2');
});

test('only host can add or remove custom suggestions and discovery places in lobby', async () => {
  const { registerLobbySocketHandlers } = require('./lobbySocketHandler');
  const { issueHostToken } = require('../utils/hostAuth');
  const pin = '9123';
  const hostId = 'host-uuid-1';
  const guestId = 'guest-uuid-2';
  const hostToken = issueHostToken(pin, hostId);

  const activeLobbies = new Map();
  const activeVotingSessions = new Map();
  const disconnectTimeouts = new Map();
  const roomSummaryCache = new Map([
    [pin, { room: { id: 'room-1', pin, hostId, status: 'CONFIGURING' }, expiresAt: Date.now() + 60000 }],
  ]);

  const mockStore = {
    activeLobbies,
    activeVotingSessions,
    disconnectTimeouts,
    roomSummaryCache,
    getCachedRoomSummary: async (p) => roomSummaryCache.get(p)?.room || null,
  };

  const roomEmissions = [];
  const mockIo = {
    to: (targetPin) => ({
      emit: (event, payload) => roomEmissions.push({ targetPin, event, payload }),
    }),
  };

  function createMockSocket() {
    const handlers = {};
    const directEmissions = [];
    return {
      data: {},
      join: () => {},
      on: (event, cb) => { handlers[event] = cb; },
      emit: (event, payload) => directEmissions.push({ event, payload }),
      trigger: async (event, data) => handlers[event](data),
      directEmissions,
    };
  }

  const hostSocket = createMockSocket();
  const guestSocket = createMockSocket();
  const outsiderSocket = createMockSocket();
  registerLobbySocketHandlers(mockIo, hostSocket, mockStore);
  registerLobbySocketHandlers(mockIo, guestSocket, mockStore);
  registerLobbySocketHandlers(mockIo, outsiderSocket, mockStore);

  await hostSocket.trigger('join_lobby', { pin, participant_id: hostId, host_token: hostToken, user_name: 'Host' });
  await guestSocket.trigger('join_lobby', { pin, participant_id: guestId, user_name: 'Guest' });

  // Unjoined outsider attempts to add suggestion -> blocked
  await outsiderSocket.trigger('add_suggestion', { pin, suggestion: 'Sneaky Option', participant_id: 'outsider-99' });
  // Non-host guest attempts to remove discovery place -> blocked
  await guestSocket.trigger('remove_discovery_place', { pin, option_id: 'opt-1', participant_id: guestId });

  const lobby = activeLobbies.get(pin);
  assert.equal(lobby.suggestions.length, 0, 'Unjoined outsider must not be able to add suggestions');
  assert.equal(Boolean(lobby.removedOptionIds?.has('opt-1')), false, 'Non-host must not be able to remove places');
  assert.equal(outsiderSocket.directEmissions.filter((e) => e.event === 'room_error').length, 1);
  assert.equal(guestSocket.directEmissions.filter((e) => e.event === 'room_error').length, 1);

  // Joined guest and host can add suggestions; only host can remove suggestions or discovery places
  await guestSocket.trigger('add_suggestion', { pin, suggestion: 'Guest Option', participant_id: guestId, user_name: 'Guest' });
  assert.deepEqual(lobby.suggestions, ['Guest Option']);

  await guestSocket.trigger('remove_suggestion', { pin, suggestion: 'Guest Option', participant_id: guestId });
  assert.deepEqual(lobby.suggestions, ['Guest Option'], 'Non-host cannot remove suggestions');

  await hostSocket.trigger('remove_suggestion', { pin, suggestion: 'Guest Option', participant_id: hostId, host_token: hostToken });
  assert.deepEqual(lobby.suggestions, []);

  await hostSocket.trigger('add_suggestion', { pin, suggestion: 'Host Option', participant_id: hostId, host_token: hostToken });
  assert.deepEqual(lobby.suggestions, ['Host Option']);

  await hostSocket.trigger('remove_suggestion', { pin, suggestion: 'Host Option', participant_id: hostId, host_token: hostToken });
  assert.deepEqual(lobby.suggestions, []);

  await hostSocket.trigger('add_discovery_place', { pin, count: 2, participant_id: hostId, host_token: hostToken });
  assert.equal(lobby.visiblePlacesCount, 8);

  await hostSocket.trigger('remove_discovery_place', { pin, option_id: 'opt-1', participant_id: hostId, host_token: hostToken });
  assert.equal(lobby.removedOptionIds.has('opt-1'), true);
});
