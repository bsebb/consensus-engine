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
