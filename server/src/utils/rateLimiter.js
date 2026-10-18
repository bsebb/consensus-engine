/**
 * Sliding-window in-memory rate limiter without third-party dependencies.
 */
const ipStore = new Map();

// Periodic cleanup of stale IP records every 5 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipStore.entries()) {
    if (now - entry.resetTime > 300000) {
      ipStore.delete(ip);
    }
  }
}, 300000);
if (cleanupTimer.unref) cleanupTimer.unref();

function createRateLimiter({ windowMs = 60000, max = 30, message = 'Too many requests, please try again shortly.' } = {}) {
  return function rateLimiterMiddleware(req, res, next) {
    const rawIp =
      req.headers['x-forwarded-for'] ||
      req.socket?.remoteAddress ||
      req.ip ||
      '127.0.0.1';
    const ip = String(rawIp).split(',')[0].trim();

    const now = Date.now();
    let entry = ipStore.get(ip);

    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      ipStore.set(ip, entry);
    } else {
      entry.count += 1;
    }

    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (entry.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message,
        retryAfter: resetSeconds,
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  _ipStore: ipStore,
};
