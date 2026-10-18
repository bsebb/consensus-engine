/**
 * Sliding-window in-memory rate limiter without third-party dependencies.
 * Each limiter instance maintains an isolated state map to prevent cross-route budget sharing.
 */
const defaultStore = new Map();

function createRateLimiter({ windowMs = 60000, max = 30, message = 'Too many requests, please try again shortly.' } = {}) {
  const store = new Map();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.resetTime > windowMs * 2) {
        store.delete(key);
      }
    }
  }, Math.max(windowMs, 60000));
  if (cleanupTimer.unref) cleanupTimer.unref();

  return function rateLimiterMiddleware(req, res, next) {
    // Rely on req.ip (configured with Express trust proxy) or socket remoteAddress
    const rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const ip = String(rawIp).split(',')[0].trim();

    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      store.set(ip, entry);
      defaultStore.set(ip, entry); // Sync for test inspections
    } else {
      entry.count += 1;
      defaultStore.set(ip, entry);
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
  _ipStore: defaultStore,
};
