/**
 * @typedef {Object} Vote
 * @property {string} option_id
 * @property {number} score 1 (Approve), -1 (Pass), -100 (Veto)
 */

/**
 * @typedef {Object} ParticipantSubmission
 * @property {string} participant_id
 * @property {Vote[]} votes
 */

/**
 * Resolves the winner using Approval-Condorcet (Schulze) logic.
 * @param {ParticipantSubmission[]} submissions
 * @returns {string} Winning option_id
 */


// Building an adjacency matrix for pairwise comparisons (ignoring vetoes)
function buildPairwiseMatrix(submissions) {
    const vetoed = new Set();
    const seen = new Set();

    // Collecting all IDs and filter out vetoed options (-100)
    for (const sub of submissions) {
        for (const v of sub.votes) {
            seen.add(v.option_id);
            if (v.score === -100) vetoed.add(v.option_id);
        }
    }

    // Initializing matrix with zeros for surviving options only
    const validOptions = [...seen].filter(id => !vetoed.has(id));
    const pairwise = {};

    for (const a of validOptions) {
        pairwise[a] = {};
        for (const b of validOptions) {
            pairwise[a][b] = 0;
        }
    }

    // Calculating head-to-head victories
    for (const sub of submissions) {
        const ballot = sub.votes.filter(v => !vetoed.has(v.option_id));

        for (let i = 0; i < ballot.length; i++) {
            for (let j = i + 1; j < ballot.length; j++) {
                const { option_id: idA, score: scoreA } = ballot[i];
                const { option_id: idB, score: scoreB } = ballot[j];

                if (scoreA > scoreB) {
                    pairwise[idA][idB]++;
                } else if (scoreB > scoreA) {
                    pairwise[idB][idA]++;
                }
            }
        }
    }

    return { validOptions, pairwise };
}


// Computing strongest paths using modified Floyd-Warshall
function calculateStrongestPaths(validOptions, pairwise) {
    const strongest = {};

    // Initializing base strengths (direct wins only)
    for (const a of validOptions) {
        strongest[a] = {};
        for (const b of validOptions) {
            strongest[a][b] = pairwise[a][b] > pairwise[b][a] ? pairwise[a][b] : 0;
        }
    }

    // Finding maximum bottleneck paths
    for (const k of validOptions) {
        for (const i of validOptions) {
            if (i === k) continue;

            for (const j of validOptions) {
                if (i === j || j === k) continue;

                strongest[i][j] = Math.max(
                    strongest[i][j],
                    Math.min(strongest[i][k], strongest[k][j])
                );
            }
        }
    }

    return strongest;
}


/**
 * Resolving the winner using Approval-Condorcet (Schulze) logic
 * @param {ParticipantSubmission[]} submissions
 * @returns {string|null} Winning option_id or null if no valid options
 */
function calculateSchulzeWinner(submissions) {
    // Validation
    if (!Array.isArray(submissions)) {
        throw new TypeError('Submissions payload must be an array');
    }

    for (const sub of submissions) {
        if (!sub?.votes || !Array.isArray(sub.votes)) {
            throw new TypeError(`Malformed submission from participant: ${sub?.participant_id || 'unknown'}`);
        }

        for (const v of sub.votes) {
            if (!v.option_id || typeof v.score !== 'number') {
                throw new TypeError('Vote objects must contain a valid option_id and numeric score');
            }
            if (v.score !== 1 && v.score !== -1 && v.score !== -100) {
                throw new RangeError(`Illegal score value: ${v.score}. Expected 1, -1, or -100`);
            }
        }
    }

    // Building direct comparisons
    const { validOptions, pairwise } = buildPairwiseMatrix(submissions);
    if (!validOptions.length) return null;

    // Finding strongest paths (Floyd-Warshall)
    const strongest = calculateStrongestPaths(validOptions, pairwise);

    // Resolving Condorcet winner
    // A candidate wins if their path strength against ALL opponents is >= the opponent's path strength back
    const winner = validOptions.find(candidate =>
        validOptions.every(opponent =>
            candidate === opponent || strongest[candidate][opponent] >= strongest[opponent][candidate]
        )
    );

    return winner || null;
}

module.exports = {
    calculateSchulzeWinner
};

