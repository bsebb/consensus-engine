/**
 * Strict tier hierarchy for Condorcet pairwise tournaments
 */
const TIER = Object.freeze({
  VETO: -100, // Candidate removed from tournament (unless all vetoed)
  PASS: -1,   // Disliked / Passed
  UNSEEN: 0,  // Neutral / skipped / fatigue cutoff
  LIKE: 1,    // Approved / Liked
  SUPER: 2,   // High preference / Superliked
});

const ALLOWED_TIERS = new Set(Object.values(TIER));

class BallotValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BallotValidationError';
    this.code = code;
  }
}

/**
 * Sanitizes and validates a ballot against snapshot candidate IDs.
 * Enforces per-voter quotas (max 1 Veto, max 1 Superlike).
 * Unvoted / missing options default to TIER.UNSEEN.
 *
 * @param {Array<{option_id?: string, optionId?: string, score: number}>} rankings
 * @param {string[]} validOptionIds
 * @returns {Map<string, number>} Map of optionId -> sanitized tier score
 */
function sanitizeBallot(rankings, validOptionIds) {
  if (!Array.isArray(validOptionIds) || validOptionIds.length === 0) {
    throw new BallotValidationError('INVALID_ROOM_OPTIONS', 'No valid options defined for room');
  }

  const validSet = new Set(validOptionIds);
  const sanitized = new Map(validOptionIds.map((id) => [id, TIER.UNSEEN]));

  let vetoCount = 0;
  let superCount = 0;

  if (Array.isArray(rankings)) {
    for (const item of rankings) {
      if (!item || typeof item !== 'object') continue;
      const optionId = item.option_id || item.optionId;
      const score = Number(item.score);

      // Drop spoofed or unknown option IDs
      if (!validSet.has(optionId)) continue;

      if (!ALLOWED_TIERS.has(score)) {
        throw new BallotValidationError('INVALID_SCORE', `Score ${score} is not permitted`);
      }

      // Quota enforcement
      if (score === TIER.VETO) {
        vetoCount++;
        if (vetoCount > 1) {
          throw new BallotValidationError('VETO_QUOTA_EXCEEDED', 'Maximum 1 veto permitted per voter');
        }
      }
      if (score === TIER.SUPER) {
        superCount++;
        if (superCount > 1) {
          throw new BallotValidationError('SUPERLIKE_QUOTA_EXCEEDED', 'Maximum 1 superlike permitted per voter');
        }
      }

      sanitized.set(optionId, score);
    }
  }

  return sanitized;
}

module.exports = {
  TIER,
  ALLOWED_TIERS,
  BallotValidationError,
  sanitizeBallot,
};
