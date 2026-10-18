const crypto = require('crypto');

const HOST_TOKEN_SECRET = process.env.HOST_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

/**
 * Generates a cryptographically strong 4-digit room PIN (1000-9999).
 */
const generatePin = () => crypto.randomInt(1000, 10000).toString();

/**
 * Issues an HMAC-SHA256 authentication token for room host actions.
 */
const issueHostToken = (pin, hostId) => {
  if (!pin || !hostId) return '';
  return crypto.createHmac('sha256', HOST_TOKEN_SECRET).update(`${pin}:${hostId}`).digest('hex');
};

/**
 * Constant-time comparison to verify host token authenticity.
 */
const verifyHostToken = (pin, hostId, token) => {
  if (!pin || !hostId || typeof token !== 'string') return false;
  const expected = issueHostToken(pin, hostId);
  if (expected.length !== token.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(token, 'hex'));
  } catch {
    return false;
  }
};

module.exports = {
  generatePin,
  issueHostToken,
  verifyHostToken,
};
