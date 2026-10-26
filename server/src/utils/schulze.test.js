const assert = require('node:assert');
const test = require('node:test');
const { calculateSchulzeWinner, executeSchulzeTournament } = require('./schulze');
const { TIER, sanitizeBallot, BallotValidationError } = require('./ballot');

test('Schulze & Ballot Validation Suite', async (t) => {
  await t.test('Sanitizer: normalizes valid ballots and enforces quotas', () => {
    const candidateIds = ['opt1', 'opt2', 'opt3', 'opt4'];
    const rankings = [
      { option_id: 'opt1', score: 1 },
      { option_id: 'opt2', score: 2 },
      { option_id: 'opt3', score: -100 },
    ];

    const sanitized = sanitizeBallot(rankings, candidateIds);
    assert.strictEqual(sanitized.get('opt1'), 1);
    assert.strictEqual(sanitized.get('opt2'), 2);
    assert.strictEqual(sanitized.get('opt3'), -100);
    assert.strictEqual(sanitized.get('opt4'), 0, 'Unvoted option defaults to UNSEEN (0)');

    // Reject > 1 veto
    assert.throws(
      () =>
        sanitizeBallot(
          [
            { option_id: 'opt1', score: -100 },
            { option_id: 'opt2', score: -100 },
          ],
          candidateIds
        ),
      BallotValidationError
    );

    // Reject > 1 superlike
    assert.throws(
      () =>
        sanitizeBallot(
          [
            { option_id: 'opt1', score: 2 },
            { option_id: 'opt2', score: 2 },
          ],
          candidateIds
        ),
      BallotValidationError
    );

    // Reject illegal scores
    assert.throws(
      () => sanitizeBallot([{ option_id: 'opt1', score: 99 }], candidateIds),
      BallotValidationError
    );
  });

  await t.test('Schulze: absolute Condorcet winner', () => {
    const submissions = [
      { participant_id: 'p1', votes: [{ option_id: 'X', score: 1 }, { option_id: 'Y', score: -1 }, { option_id: 'Z', score: -1 }] },
      { participant_id: 'p2', votes: [{ option_id: 'X', score: 1 }, { option_id: 'Y', score: -1 }, { option_id: 'Z', score: -1 }] },
      { participant_id: 'p3', votes: [{ option_id: 'X', score: 1 }, { option_id: 'Y', score: -1 }, { option_id: 'Z', score: -1 }] },
    ];

    const result = executeSchulzeTournament(submissions);
    assert.strictEqual(result.winnerId, 'X');
    assert.strictEqual(result.status, 'CLEAR');
    assert.strictEqual(result.support.liked, 3);
    assert.strictEqual(result.support.total, 3);
    assert.strictEqual(result.vetoCount, 0);
    assert.strictEqual(result.ranking[0].optionId, 'X');
    assert.strictEqual(calculateSchulzeWinner(submissions), 'X');
  });

  await t.test('Schulze: Condorcet 3-cycle paradox with decisive support breaks the paradox', () => {
    // 3-way cycle between A, B, C, but voter 4 gives Superlike (2) to A over B (1)
    const submissions = [
      { participant_id: 'p1', votes: [{ option_id: 'A', score: 1 }, { option_id: 'B', score: -1 }, { option_id: 'C', score: -1 }] },
      { participant_id: 'p2', votes: [{ option_id: 'B', score: 1 }, { option_id: 'C', score: -1 }, { option_id: 'A', score: -1 }] },
      { participant_id: 'p3', votes: [{ option_id: 'C', score: 1 }, { option_id: 'A', score: -1 }, { option_id: 'B', score: -1 }] },
      { participant_id: 'p4', votes: [{ option_id: 'A', score: 2 }, { option_id: 'B', score: 1 }, { option_id: 'C', score: -1 }] },
    ];

    const result = executeSchulzeTournament(submissions);
    assert.strictEqual(result.winnerId, 'A', 'A should strictly break the paradox');
    assert.strictEqual(result.ranking[0].optionId, 'A');
  });

  await t.test('Schulze: Deterministic tie-break via SHA-256 hash when perfectly tied', () => {
    // A and B perfectly tied across all voters
    const submissions = [
      { participant_id: 'p1', votes: [{ option_id: 'A', score: 1 }, { option_id: 'B', score: -1 }] },
      { participant_id: 'p2', votes: [{ option_id: 'A', score: -1 }, { option_id: 'B', score: 1 }] },
    ];

    const res1 = executeSchulzeTournament(submissions, ['A', 'B'], '9999');
    const res2 = executeSchulzeTournament(submissions, ['A', 'B'], '9999');
    assert.strictEqual(res1.winnerId, res2.winnerId);
    assert.strictEqual(res1.tieBroken, true);
    assert.strictEqual(res1.status, 'TIE_BROKEN');
  });

  await t.test('Schulze: Hard veto prunes candidate from tournament', () => {
    const submissions = [
      { participant_id: 'p1', votes: [{ option_id: 'M', score: 1 }, { option_id: 'N', score: 1 }] },
      { participant_id: 'p2', votes: [{ option_id: 'M', score: 1 }, { option_id: 'N', score: -1 }] },
      { participant_id: 'p3', votes: [{ option_id: 'M', score: 1 }, { option_id: 'N', score: 1 }] },
      { participant_id: 'p4', votes: [{ option_id: 'M', score: -100 }, { option_id: 'N', score: 1 }] },
    ];

    const result = executeSchulzeTournament(submissions);
    assert.strictEqual(result.winnerId, 'N', 'M was vetoed so N must win');
    assert.strictEqual(result.allVetoed, false);
    const mRank = result.ranking.find((r) => r.optionId === 'M');
    assert.strictEqual(mRank.vetoed, true);
    assert.strictEqual(mRank.rank, 2, 'Vetoed option is relegated to bottom');
  });

  await t.test('Schulze: All-vetoed fallback prefers fewest vetoes', () => {
    const submissions = [
      { participant_id: 'p1', votes: [{ option_id: 'A', score: -100 }, { option_id: 'B', score: -1 }] },
      { participant_id: 'p2', votes: [{ option_id: 'A', score: -100 }, { option_id: 'B', score: -100 }] },
    ];

    const result = executeSchulzeTournament(submissions);
    assert.strictEqual(result.allVetoed, true);
    // B has 1 veto, A has 2 vetoes -> B should win
    assert.strictEqual(result.winnerId, 'B');
  });

  await t.test('Schulze: All-pass produces NO_CONSENSUS status', () => {
    const submissions = [
      { participant_id: 'p1', votes: [{ option_id: 'A', score: -1 }, { option_id: 'B', score: -1 }] },
      { participant_id: 'p2', votes: [{ option_id: 'A', score: -1 }, { option_id: 'B', score: -1 }] },
    ];

    const result = executeSchulzeTournament(submissions);
    assert.strictEqual(result.status, 'NO_CONSENSUS');
    assert.strictEqual(result.support.liked, 0);
    assert.ok(result.winnerId !== null);
  });

  await t.test('Schulze: Single voter edge case', () => {
    const submissions = [
      { participant_id: 'p1', votes: [{ option_id: 'Alpha', score: 2 }, { option_id: 'Beta', score: 1 }] },
    ];

    const result = executeSchulzeTournament(submissions);
    assert.strictEqual(result.winnerId, 'Alpha');
    assert.strictEqual(result.status, 'CLEAR');
    assert.strictEqual(result.ranking[0].optionId, 'Alpha');
    assert.strictEqual(result.ranking[1].optionId, 'Beta');
  });

  await t.test('Schulze: Permutation invariance (ballot submission order does not alter outcome)', () => {
    const b1 = { participant_id: 'p1', votes: [{ option_id: 'A', score: 1 }, { option_id: 'B', score: -1 }, { option_id: 'C', score: 0 }] };
    const b2 = { participant_id: 'p2', votes: [{ option_id: 'A', score: -1 }, { option_id: 'B', score: 2 }, { option_id: 'C', score: 1 }] };
    const b3 = { participant_id: 'p3', votes: [{ option_id: 'A', score: 1 }, { option_id: 'B', score: 1 }, { option_id: 'C', score: -1 }] };

    const resOrder1 = executeSchulzeTournament([b1, b2, b3], ['A', 'B', 'C'], '1234');
    const resOrder2 = executeSchulzeTournament([b3, b1, b2], ['A', 'B', 'C'], '1234');
    const resOrder3 = executeSchulzeTournament([b2, b3, b1], ['A', 'B', 'C'], '1234');

    assert.strictEqual(resOrder1.winnerId, resOrder2.winnerId);
    assert.strictEqual(resOrder1.winnerId, resOrder3.winnerId);
    assert.deepStrictEqual(
      resOrder1.ranking.map((r) => r.optionId),
      resOrder2.ranking.map((r) => r.optionId)
    );
  });
});
