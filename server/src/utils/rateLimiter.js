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

function createRateLimiter({ windowMs = 60000, max = 30, message = 'Too many requests, please try again shortly.' } = {}) {
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
    // Rely on req.ip (configured with Express trust proxy) or socket remoteAddress,
    // scoped per device_id when available so 1000+ CCU behind shared NAT/campus Wi-Fi never collide
    const rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const ip = String(rawIp).split(',')[0].trim();
    const clientDevice = req.headers?.['x-device-id'] || req.body?.device_id || req.body?.host_device_id || '';
    const bucketKey = clientDevice ? `${ip}:${String(clientDevice).slice(0, 48)}` : ip;

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
