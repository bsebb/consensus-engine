const crypto = require('node:crypto');
const { prisma } = require('../../db/prismaClient');
async function consumeSharedBudget(scope, identity, windowMs, max) {
  const key = crypto.createHash('sha256').update(`${process.env.RATE_LIMIT_NAMESPACE || 'consensus'}:${scope}:${identity}`).digest('hex');
  const [row] = await prisma.$queryRaw`
    INSERT INTO api_rate_limits (key, count, "resetAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP + ${windowMs} * INTERVAL '1 millisecond')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN api_rate_limits."resetAt" <= CURRENT_TIMESTAMP THEN 1 ELSE api_rate_limits.count + 1 END,
      "resetAt" = CASE WHEN api_rate_limits."resetAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + ${windowMs} * INTERVAL '1 millisecond' ELSE api_rate_limits."resetAt" END
    RETURNING count, "resetAt"`;
  return { allowed: row.count <= max, remaining: Math.max(0, max - row.count), resetSeconds: Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)) };
}
module.exports = { consumeSharedBudget };
