/**
 * Sliding-window in-memory rate limiter without third-party dependencies.
 * Each limiter instance maintains an isolated state map to prevent cross-route budget sharing.
 */
const defaultStore = new Map();
const MAX_RATE_LIMITER_ENTRIES = 15000;

function pruneStoreIfFull(map) {
  if (map.size > MAX_RATE_LIMITER_ENTRIES) {
    const iter = map.keys();
    for (let i = 0; i < 500; i++) {
      const nextKey = iter.next().value;
      if (nextKey) map.delete(nextKey);
      else break;
    }
  }
}

function createRateLimiter({ scope = 'http', windowMs = 60000, max = 30, message = 'Too many requests, please try again shortly.' } = {}) {
  const store = new Map();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.resetTime > windowMs * 2) {
        store.delete(key);
      }
    }
    for (const [key, entry] of defaultStore.entries()) {
      if (now - entry.resetTime > windowMs * 2) {
        defaultStore.delete(key);
      }
    }
  }, Math.max(windowMs, 60000));
  if (cleanupTimer.unref) cleanupTimer.unref();

  return function rateLimiterMiddleware(req, res, next) {
    // Express requests share their budget across workers and restarts. Plain request
    // objects used by unit tests keep the synchronous local limiter below.
    if (req.app) {
      const identity = String(req.ip || req.socket?.remoteAddress || 'unknown');
      return require('../state/sharedRateLimit').consumeSharedBudget(`${scope}:${windowMs}:${max}:${message}`, identity, windowMs, max)
        .then(result => {
          res.setHeader('X-RateLimit-Limit', max);
          res.setHeader('X-RateLimit-Remaining', result.remaining);
          res.setHeader('X-RateLimit-Reset', result.resetSeconds);
          if (!result.allowed) {
            res.setHeader('Retry-After', result.resetSeconds);
            return res.status(429).json({ success: false, error: 'TOO_MANY_REQUESTS', message, retryAfter: result.resetSeconds });
          }
          next();
        }).catch(() => res.status(503).json({ success: false, error: 'SERVICE_UNAVAILABLE', message: 'Please try again shortly.' }));
    }

    // Rely on req.ip (configured with Express trust proxy) or socket remoteAddress,
    // Client-supplied device identifiers must not create additional rate budgets.
    const rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const ip = String(rawIp).split(',')[0].trim();
    const bucketKey = ip;

    const now = Date.now();
    let entry = store.get(bucketKey);

    if (!entry || now > entry.resetTime) {
      pruneStoreIfFull(store);
      pruneStoreIfFull(defaultStore);
      entry = { count: 1, resetTime: now + windowMs };
      store.set(bucketKey, entry);
      defaultStore.set(bucketKey, entry); // Sync for test inspections
    } else {
      entry.count += 1;
      defaultStore.set(bucketKey, entry);
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
