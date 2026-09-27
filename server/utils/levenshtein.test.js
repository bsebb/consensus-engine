/**
 * Isolated unit tests for the Levenshtein distance duplicate detection logic.
 * Verifies string normalization, threshold accuracy, and edge cases.
 */
const { isDuplicateIdea } = require('./levenshtein');

const testCases = [
    {
        description: 'Exact match (different casing)',
        newIdea: 'Learn Machine Learning',
        existingIdea: 'learn MACHINE learning',
        expected: true
    },
    {
        description: 'Minor typo (distance 1)',
        newIdea: 'Lern Machine Learning',
        existingIdea: 'learn machine learning',
        expected: true
    },
    {
        description: 'Formatting mess (extra whitespace)',
        newIdea: '  Learn   Machine     Learning   ',
        existingIdea: 'learn machine learning',
        expected: true
    },
    {
        description: 'Completely different concepts',
        newIdea: 'Sushi',
        existingIdea: 'Steakhouse',
        expected: false
    },
    {
        description: 'Edge case: Empty string',
        newIdea: '',
        existingIdea: 'Some existing idea',
        expected: false
    }
];

console.log('Starting tests for isDuplicateIdea...\n');

let passedCount = 0;
let failedCount = 0;

testCases.forEach((test, index) => {
    try {
        const result = isDuplicateIdea(test.newIdea, test.existingIdea);

        if (result.isDuplicate === test.expected) {
            console.log(`[PASS] Test ${index + 1}:${test.description}`);
            passedCount++;
        } else {
            console.log(`[FAIL] Test ${index + 1}:${test.description}`);
            console.log(`       Compared: "${test.newIdea}" vs "${test.existingIdea}"`);
            console.log(`       Expected: ${test.expected}, Got:${result.isDuplicate} (Distance: ${result.distance})`);
            failedCount++;
        }
    } catch (error) {
        console.log(`[ERROR] Test ${index + 1}:${test.description}`);
        console.log(`        Threw Error: ${error.message}`);
        failedCount++;
    }
});

console.log('\n--- TEST SUMMARY ---');
if (failedCount === 0) {
    console.log(`SUCCESS: All ${passedCount} tests passed.`);
} else {
    console.log(`WARNING: ${passedCount} tests passed,${failedCount} tests failed.`);
}