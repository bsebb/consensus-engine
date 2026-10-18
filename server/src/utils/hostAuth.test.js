const assert = require('assert');
const { generatePin, issueHostToken, verifyHostToken } = require('./hostAuth');

// 1. PIN generation
for (let i = 0; i < 100; i++) {
  const pin = generatePin();
  assert.strictEqual(pin.length, 4, 'PIN must be 4 digits');
  const num = Number(pin);
  assert.ok(num >= 1000 && num <= 9999, 'PIN must be in range 1000-9999');
}

// 2. Token issue & verify
const pin = '4829';
const hostId = 'user_abc_123';
const token = issueHostToken(pin, hostId);

assert.ok(token && typeof token === 'string', 'Token must be non-empty string');
assert.strictEqual(verifyHostToken(pin, hostId, token), true, 'Valid token must verify true');
assert.strictEqual(verifyHostToken(pin, 'attacker_id', token), false, 'Token with different user must fail');
assert.strictEqual(verifyHostToken('9999', hostId, token), false, 'Token with different PIN must fail');
assert.strictEqual(verifyHostToken(pin, hostId, 'invalid_token'), false, 'Corrupted token must fail');
assert.strictEqual(verifyHostToken(pin, hostId, ''), false, 'Empty token must fail');

console.log('[PASS] hostAuth unit tests passed successfully.');
