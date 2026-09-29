const assert = require('node:assert');
const { calculateSchulzeWinner } = require('./schulze.js');

// Mocks
const absoluteWinnerMock = [
    { participant_id: 'p1', votes: [{ option_id: 'X', score: 1 }, { option_id: 'Y', score: -1 }, { option_id: 'Z', score: -1 }] },
    { participant_id: 'p2', votes: [{ option_id: 'X', score: 1 }, { option_id: 'Y', score: -1 }, { option_id: 'Z', score: -1 }] },
    { participant_id: 'p3', votes: [{ option_id: 'X', score: 1 }, { option_id: 'Y', score: -1 }, { option_id: 'Z', score: -1 }] }
];

const condorcetCycleMock = [
    { participant_id: 'p1', votes: [{ option_id: 'A', score: 1 }, { option_id: 'B', score: -1 }, { option_id: 'C', score: -1 }] },
    { participant_id: 'p2', votes: [{ option_id: 'B', score: 1 }, { option_id: 'C', score: -1 }, { option_id: 'A', score: -1 }] },
    { participant_id: 'p3', votes: [{ option_id: 'C', score: 1 }, { option_id: 'A', score: -1 }, { option_id: 'B', score: -1 }] },
    { participant_id: 'p4', votes: [{ option_id: 'A', score: 1 }, { option_id: 'B', score: 1 }, { option_id: 'C', score: -1 }] }
];

const vetoEliminationMock = [
    { participant_id: 'p1', votes: [{ option_id: 'M', score: 1 }, { option_id: 'N', score: 1 }] },
    { participant_id: 'p2', votes: [{ option_id: 'M', score: 1 }, { option_id: 'N', score: -1 }] },
    { participant_id: 'p3', votes: [{ option_id: 'M', score: 1 }, { option_id: 'N', score: 1 }] },
    { participant_id: 'p4', votes: [{ option_id: 'M', score: -100 }, { option_id: 'N', score: 1 }] }
];

function runTests() {
    console.log('Running Schulze tests...');

    try {
        // Validation cases
        assert.throws(() => calculateSchulzeWinner({}), TypeError, 'Should reject non-array payloads');
        assert.throws(
            () => calculateSchulzeWinner([{ participant_id: 'p1', votes: [{ option_id: 'A', score: 42 }] }]),
            RangeError,
            'Should reject illegal scores'
        );

        // Logic cases (expecting actual winners)
        assert.strictEqual(calculateSchulzeWinner(absoluteWinnerMock), 'X', 'Test A: X should be the absolute winner');
        assert.strictEqual(calculateSchulzeWinner(condorcetCycleMock), 'A', 'Test B: A should break the paradox');
        assert.strictEqual(calculateSchulzeWinner(vetoEliminationMock), 'N', 'Test C: M is vetoed, N should win');

        console.log('Skeleton tests passed.');
    } catch (err) {
        console.error('Test failed:', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    runTests();
}

module.exports = { runTests };