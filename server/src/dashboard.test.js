const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { app, httpServer, io, ready } = require('../app');
const auth = require('./dashboard/auth');
let base;
const sessionIds = [];
const challengeIds = [];
const post = (path, body, headers = {}) =>
  fetch(base + '/api/v1/dashboard' + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://www.noyoupick.org',
      ...headers,
    },
    body: JSON.stringify(body),
  });
before(async () => {
  await ready;
  await new Promise((r) => httpServer.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + httpServer.address().port;
});
after(async () => {
  await auth.db.dashboardSession.deleteMany({
    where: { id: { in: sessionIds } },
  });
  await auth.db.dashboardChallenge.deleteMany({
    where: { id: { in: challengeIds } },
  });
  await new Promise((r) => io.close(r));
  await auth.db.$disconnect();
});
async function session(expired = false) {
  const raw = randomBytes(32).toString('base64url');
  const id = auth.hash(raw);
  sessionIds.push(id);
  await auth.db.dashboardSession.create({
    data: { id, expiresAt: new Date(Date.now() + (expired ? -60000 : 60000)) },
  });
  return raw;
}
test('dashboard aggregates require a valid owner session and never accept the infrastructure API key', async () => {
  for (const headers of [
    {},
    { Authorization: 'Bearer ' + (process.env.ADMIN_API_KEY || 'test-admin') },
    { Cookie: auth.COOKIE + '=bad' },
  ]) {
    const r = await fetch(base + '/api/v1/dashboard/analytics', { headers });
    assert.equal(r.status, 401);
    assert.match(r.headers.get('cache-control'), /no-store/);
    assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.deepEqual(await r.json(), { error: 'Please sign in.' });
  }
});
test('dashboard mutations reject cross-origin and non-JSON requests', async () => {
  for (const endpoint of ['/login/options', '/register/options', '/logout']) {
    assert.equal(
      (await post(endpoint, {}, { Origin: 'https://attacker.invalid' })).status,
      403
    );
    assert.equal(
      (await post(endpoint, {}, { 'Content-Type': 'text/plain' })).status,
      415
    );
  }
});
test('owner enrollment is closed without its one-time setup capability', async () => {
  assert.equal(
    (await post('/register/options', { setupToken: 'a'.repeat(43) })).status,
    403
  );
  assert.equal(
    (await post('/register/verify', { setupToken: 'a'.repeat(43) })).status,
    403
  );
});
test('passkey challenges require the browser binding and are consumed exactly once', async () => {
  const r = await post('/login/options', {});
  assert.equal(r.status, 200);
  const value = await r.json();
  challengeIds.push(value.challengeId);
  const c = r.headers.get('set-cookie').split(';')[0];
  assert.match(
    r.headers.get('set-cookie'),
    /HttpOnly; Secure; SameSite=Strict/
  );
  const body = {
    challengeId: value.challengeId,
    response: { id: 'missing-key' },
  };
  assert.equal((await post('/login/verify', body)).status, 400);
  assert.ok(
    await auth.db.dashboardChallenge.findUnique({
      where: { id: value.challengeId },
    })
  );
  assert.equal((await post('/login/verify', body, { Cookie: c })).status, 401);
  assert.equal(
    await auth.db.dashboardChallenge.findUnique({
      where: { id: value.challengeId },
    }),
    null
  );
  assert.equal((await post('/login/verify', body, { Cookie: c })).status, 400);
});
test('expired and logged-out dashboard sessions cannot read aggregate data', async () => {
  const old = await session(true);
  assert.equal(
    (
      await fetch(base + '/api/v1/dashboard/analytics', {
        headers: { Cookie: auth.COOKIE + '=' + old },
      })
    ).status,
    401
  );
  const raw = await session();
  const headers = { Cookie: auth.COOKIE + '=' + raw };
  assert.deepEqual(
    await (await fetch(base + '/api/v1/dashboard/session', { headers })).json(),
    { authenticated: true }
  );
  assert.equal((await post('/logout', {}, headers)).status, 200);
  assert.equal(
    (await fetch(base + '/api/v1/dashboard/analytics', { headers })).status,
    401
  );
});
test('dashboard queries are bounded and return aggregates without participant credentials or snapshots', async () => {
  const raw = await session();
  const headers = { Cookie: auth.COOKIE + '=' + raw };
  assert.equal(
    (
      await fetch(base + '/api/v1/dashboard/analytics?days=1000000', {
        headers,
      })
    ).status,
    400
  );
  const r = await fetch(base + '/api/v1/dashboard/analytics?days=7', {
    headers,
  });
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.days, 7);
  assert.ok(Number.isInteger(data.summary.rooms));
  assert.ok(Array.isArray(data.daily));
  assert.ok(data.categories.length <= 10);
  assert.ok(data.popular.length <= 10);
  assert.doesNotMatch(
    JSON.stringify(data),
    /deviceId|hostId|runtimeState|publicKey|setupToken|participantId/
  );
});

test('one-time owner setup links expire after 24 hours even with a matching stored hash', async () => {
  const expired =
    Date.now() - 25 * 3600000 + '.' + randomBytes(32).toString('base64url');
  await auth.db.dashboardOwner.update({
    where: { id: 'owner' },
    data: { setupTokenHash: auth.hash(expired) },
  });
  try {
    assert.equal(
      (await post('/register/options', { setupToken: expired })).status,
      403
    );
  } finally {
    await auth.db.dashboardOwner.update({
      where: { id: 'owner' },
      data: { setupTokenHash: null },
    });
  }
});

test('private dashboard reads reject sibling subdomains even with a valid owner cookie', async () => {
  const raw = await session();
  const response = await fetch(base + '/api/v1/dashboard/analytics', {
    headers: { Origin: 'https://other.noyoupick.org', Cookie: auth.COOKIE + '=' + raw },
  });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.deepEqual(await response.json(), { error: 'Request not allowed.' });
});
