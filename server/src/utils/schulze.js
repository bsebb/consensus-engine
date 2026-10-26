const crypto = require('crypto');
const { TIER } = require('./ballot');

/**
 * Builds pairwise head-to-head matrix for surviving candidates.
 *
 * @param {Array<{participant_id?: string, votes: Array<{option_id: string, score: number}>}>} submissions
 * @param {string[]} validOptions
 * @returns {Record<string, Record<string, number>>}
 */
function buildPairwiseMatrix(submissions, validOptions) {
  const pairwise = {};
  for (const a of validOptions) {
    pairwise[a] = {};
    for (const b of validOptions) {
      pairwise[a][b] = 0;
    }
  }

  for (const sub of submissions) {
    const scoreMap = new Map();
    for (const v of sub.votes || []) {
      scoreMap.set(v.option_id, v.score);
    }

    for (let i = 0; i < validOptions.length; i++) {
      for (let j = i + 1; j < validOptions.length; j++) {
        const idA = validOptions[i];
        const idB = validOptions[j];
        const scoreA = scoreMap.has(idA) ? scoreMap.get(idA) : TIER.UNSEEN;
        const scoreB = scoreMap.has(idB) ? scoreMap.get(idB) : TIER.UNSEEN;

        if (scoreA > scoreB) {
          pairwise[idA][idB]++;
        } else if (scoreB > scoreA) {
          pairwise[idB][idA]++;
        }
      }
    }
  }

  return pairwise;
}

/**
 * Computes strongest paths using Floyd-Warshall algorithm.
 *
 * @param {string[]} validOptions
 * @param {Record<string, Record<string, number>>} pairwise
 * @returns {Record<string, Record<string, number>>}
 */
function calculateStrongestPaths(validOptions, pairwise) {
  const strongest = {};

  for (const a of validOptions) {
    strongest[a] = {};
    for (const b of validOptions) {
      strongest[a][b] = pairwise[a][b] > pairwise[b][a] ? pairwise[a][b] : 0;
    }
  }

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
 * Computes hash tie-break score for determinism across retries.
 */
function computeTieHash(pin, round, optionId) {
  return crypto
    .createHash('sha256')
    .update(`${pin || 'consensus'}:${round || 1}:${optionId}`)
    .digest('hex');
}

/**
 * Executes a full Schulze tournament round.
 *
 * @param {Array<{participant_id?: string, votes: Array<{option_id: string, score: number}>}>} submissions
 * @param {string[]} [explicitOptionIds]
 * @param {string} [pin]
 * @param {number} [round=1]
 * @returns {Object} Full resolution payload
 */
function executeSchulzeTournament(submissions, explicitOptionIds, pin = '0000', round = 1) {
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
      if (v.score !== 1 && v.score !== -1 && v.score !== -100 && v.score !== 2 && v.score !== 0) {
        throw new RangeError(`Illegal score value: ${v.score}. Expected 1, -1, -100, 2, or 0`);
      }
    }
  }

  // Determine universe of candidate IDs
  const allCandidateIds = new Set(explicitOptionIds || []);
  for (const sub of submissions) {
    for (const v of sub.votes) {
      allCandidateIds.add(v.option_id);
    }
  }
  const candidatePool = Array.from(allCandidateIds);
  if (candidatePool.length === 0) {
    return {
      winnerId: null,
      ranking: [],
      status: 'NO_CONSENSUS',
      support: { liked: 0, total: submissions.length },
      vetoCount: 0,
      tieBroken: false,
      allVetoed: false,
      pairwise: {},
    };
  }

  // Count vetoes, positive support, and Borda sums per candidate
  const vetoCounts = new Map();
  const supportCounts = new Map();
  const bordaCounts = new Map();

  for (const id of candidatePool) {
    vetoCounts.set(id, 0);
    supportCounts.set(id, 0);
    bordaCounts.set(id, 0);
  }

  for (const sub of submissions) {
    for (const v of sub.votes) {
      if (!allCandidateIds.has(v.option_id)) continue;
      if (v.score === TIER.VETO) {
        vetoCounts.set(v.option_id, (vetoCounts.get(v.option_id) || 0) + 1);
      } else if (v.score === TIER.LIKE || v.score === TIER.SUPER) {
        supportCounts.set(v.option_id, (supportCounts.get(v.option_id) || 0) + 1);
      }
      bordaCounts.set(v.option_id, (bordaCounts.get(v.option_id) || 0) + v.score);
    }
  }

  // Step 1: Hard Veto Pruning
  // Prune options that received ANY veto from the tournament
  let survivingCandidates = candidatePool.filter((id) => (vetoCounts.get(id) || 0) === 0);
  let allVetoed = false;

  if (survivingCandidates.length === 0) {
    // If ALL options were vetoed, fall back to the full set and let tie-break prefer fewest vetoes
    survivingCandidates = [...candidatePool];
    allVetoed = true;
  }

  // Helper function to resolve the single top winner among a set of candidates
  function resolveTopWinner(pool) {
    if (pool.length === 1) {
      return { winnerId: pool[0], tieBroken: false, pairwise: {} };
    }

    const pairwise = buildPairwiseMatrix(submissions, pool);
    const strongest = calculateStrongestPaths(pool, pairwise);

    // Unbeaten winner set: candidates where p[x, y] >= p[y, x] for all opponents y
    const unbeaten = pool.filter((x) =>
      pool.every((y) => x === y || strongest[x][y] >= strongest[y][x])
    );

    const candidatesToRank = unbeaten.length > 0 ? unbeaten : pool;

    if (candidatesToRank.length === 1) {
      return { winnerId: candidatesToRank[0], tieBroken: false, pairwise };
    }

    // Deterministic Multi-Stage Tie-Break
    let hashDecided = false;
    const sorted = [...candidatesToRank].sort((a, b) => {
      // 1. Fewest total vetoes
      const vetoDiff = (vetoCounts.get(a) || 0) - (vetoCounts.get(b) || 0);
      if (vetoDiff !== 0) return vetoDiff;

      // 2. Highest group support (likes + supers)
      const supportDiff = (supportCounts.get(b) || 0) - (supportCounts.get(a) || 0);
      if (supportDiff !== 0) return supportDiff;

      // 3. Highest Borda score sum
      const bordaDiff = (bordaCounts.get(b) || 0) - (bordaCounts.get(a) || 0);
      if (bordaDiff !== 0) return bordaDiff;

      // 4. Cryptographic deterministic hash
      hashDecided = true;
      const hashA = computeTieHash(pin, round, a);
      const hashB = computeTieHash(pin, round, b);
      return hashA.localeCompare(hashB);
    });

    return { winnerId: sorted[0], tieBroken: hashDecided, pairwise };
  }

  // Step 2: Compute full sequential ranking via repeated winner extraction
  const ranking = [];
  let remainingSurviving = [...survivingCandidates];
  let firstRoundTieBroken = false;
  let topPairwise = {};

  while (remainingSurviving.length > 0) {
    const { winnerId, tieBroken, pairwise } = resolveTopWinner(remainingSurviving);
    if (ranking.length === 0) {
      firstRoundTieBroken = tieBroken;
      topPairwise = pairwise;
    }
    ranking.push({
      optionId: winnerId,
      rank: ranking.length + 1,
      vetoed: (vetoCounts.get(winnerId) || 0) > 0,
      vetoCount: vetoCounts.get(winnerId) || 0,
      supportCount: supportCounts.get(winnerId) || 0,
      bordaScore: bordaCounts.get(winnerId) || 0,
    });
    remainingSurviving = remainingSurviving.filter((id) => id !== winnerId);
  }

  // Append any strictly vetoed options to the end of the ranking if they were excluded
  if (!allVetoed) {
    const vetoedExcluded = candidatePool
      .filter((id) => (vetoCounts.get(id) || 0) > 0)
      .sort((a, b) => (vetoCounts.get(a) || 0) - (vetoCounts.get(b) || 0));

    for (const vId of vetoedExcluded) {
      ranking.push({
        optionId: vId,
        rank: ranking.length + 1,
        vetoed: true,
        vetoCount: vetoCounts.get(vId) || 0,
        supportCount: supportCounts.get(vId) || 0,
        bordaScore: bordaCounts.get(vId) || 0,
      });
    }
  }

  const primaryWinnerId = ranking[0]?.optionId || null;
  const winnerSupport = supportCounts.get(primaryWinnerId) || 0;
  const totalVoters = submissions.length;

  // Consensus Health Status
  let status = 'CLEAR';
  if (winnerSupport === 0) {
    status = 'NO_CONSENSUS';
  } else if (winnerSupport < Math.ceil(totalVoters / 2)) {
    status = 'WEAK';
  } else if (firstRoundTieBroken) {
    status = 'TIE_BROKEN';
  }

  return {
    winnerId: primaryWinnerId,
    ranking,
    status,
    support: {
      liked: winnerSupport,
      total: totalVoters,
    },
    vetoCount: vetoCounts.get(primaryWinnerId) || 0,
    tieBroken: firstRoundTieBroken,
    allVetoed,
    pairwise: topPairwise,
  };
}

/**
 * Resolves winning option_id using Approval-Condorcet (Schulze) logic.
 * Backwards-compatible signature returning string option_id.
 *
 * @param {Array<{participant_id?: string, votes: Array<{option_id: string, score: number}>}>} submissions
 * @returns {string|null} Winning option_id or null
 */
function calculateSchulzeWinner(submissions) {
  const result = executeSchulzeTournament(submissions);
  return result.winnerId;
}

module.exports = {
  buildPairwiseMatrix,
  calculateStrongestPaths,
  executeSchulzeTournament,
  calculateSchulzeWinner,
};
