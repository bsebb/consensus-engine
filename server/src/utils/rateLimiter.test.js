const assert = require('assert');
const { createRateLimiter, _ipStore } = require('./rateLimiter');

_ipStore.clear();

const limiter = createRateLimiter({ windowMs: 1000, max: 2 });

const mockRes = () => {
  const headers = {};
  let statusCode = 200;
  let jsonBody = null;
  return {
    setHeader: (k, v) => { headers[k] = v; },
    status: (code) => {
      statusCode = code;
      return {
        json: (body) => { jsonBody = body; }
      };
    },
    get headers() { return headers; },
    get statusCode() { return statusCode; },
    get jsonBody() { return jsonBody; },
  };
};

let nextCalled = 0;
const next = () => { nextCalled++; };

const req = { ip: '1.2.3.4', headers: {}, socket: {} };

// Request 1
let res = mockRes();
limiter(req, res, next);
assert.strictEqual(nextCalled, 1);
assert.strictEqual(res.headers['X-RateLimit-Remaining'], 1);

// Request 2
res = mockRes();
limiter(req, res, next);
assert.strictEqual(nextCalled, 2);
assert.strictEqual(res.headers['X-RateLimit-Remaining'], 0);

// Request 3 (blocked)
res = mockRes();
limiter(req, res, next);
assert.strictEqual(nextCalled, 2, 'Next must not be called on rate limit exceed');
assert.strictEqual(res.statusCode, 429, 'Status must be 429');
assert.strictEqual(res.jsonBody?.error, 'TOO_MANY_REQUESTS');

console.log('[PASS] rateLimiter unit tests passed successfully.');
