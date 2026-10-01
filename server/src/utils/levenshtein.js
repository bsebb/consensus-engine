/**
 * Calculating the Levenshtein distance between two strings.
 * Memory-optimized 2-row array approach with an early exit mechanism.
 *
 * @param {string} str1 - 1st string
 * @param {string} str2 - 2nd string
 * @param {number} [maxDistance=Infinity] - early exit threshold
 * @returns {number} - the exact distance, or maxDistance + 1 if the threshold is exceeded
 * @throws {TypeError} - if inputs are not strings
 */
function getLevenshteinDistance(str1, str2, maxDistance = Infinity) {
    if (typeof str1 !== 'string' || typeof str2 !== 'string') {
        throw new TypeError('Both arguments must be strings.');
    }

    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    if (str1.length > str2.length) {
        [str1, str2] = [str2, str1];
    }

    let prevRow = new Uint16Array(str1.length + 1);
    let currRow = new Uint16Array(str1.length + 1);

    for (let i = 0; i <= str1.length; i++) {
        prevRow[i] = i;
    }

    for (let i = 1; i <= str2.length; i++) {
        currRow[0] = i;
        let minRowCost = i;

        for (let j = 1; j <= str1.length; j++) {
            const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
            currRow[j] = Math.min(
                currRow[j - 1] + 1,
                prevRow[j] + 1,
                prevRow[j - 1] + cost
            );

            if (currRow[j] < minRowCost) {
                minRowCost = currRow[j];
            }
        }

        if (minRowCost > maxDistance) {
            return maxDistance + 1;
        }

        [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[str1.length];
}

/**
 * Checking if 2 strings are duplicates based on a Levenshtein distance barrier
 * Normalizing inputs (lowercase, trims, collapses spaces) prior to comparison
 *
 * @param {string} newIdea - 1sr string to compare
 * @param {string} existingIdea - 2nd string to compare against
 * @param {number} [threshold=2] - maximum allowed distance to be considered a duplicate
 * @returns {{isDuplicate: boolean, distance: number}} - duplication status and exact distance
 * @throws {TypeError} - if either argument is not a string
 */
function isDuplicateIdea(newIdea, existingIdea, threshold = 2) {
    if (typeof newIdea !== 'string' || typeof existingIdea !== 'string') {
        throw new TypeError('Both arguments must be valid strings.');
    }

    const normalizedNew = newIdea.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedExisting = existingIdea.toLowerCase().trim().replace(/\s+/g, ' ');

    const distance = getLevenshteinDistance(normalizedNew, normalizedExisting, threshold);

    return {
        isDuplicate: distance <= threshold,
        distance: distance
    };
}

module.exports = { getLevenshteinDistance, isDuplicateIdea };