const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
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
  assert.ok(data.categories.length <= 20);
  assert.ok(data.popular.length <= 20);
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
    headers: {
      Origin: 'https://other.noyoupick.org',
      Cookie: auth.COOKIE + '=' + raw,
    },
  });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.deepEqual(await response.json(), { error: 'Request not allowed.' });
});

test('session explorer protects and validates every private read', async () => {
  for (const endpoint of ['/sessions', '/sessions/' + randomUUID()]) {
    const r = await fetch(base + '/api/v1/dashboard' + endpoint);
    assert.equal(r.status, 401);
    assert.match(r.headers.get('cache-control'), /no-store/);
  }
  const headers = { Cookie: auth.COOKIE + '=' + (await session()) };
  for (const query of [
    'page=0',
    'page=1.5',
    'page=1001',
    'days=8',
    'status=RESOLVED',
    'mode=bad',
    'search=' + 'a'.repeat(81),
  ]) {
    assert.equal(
      (await fetch(base + '/api/v1/dashboard/sessions?' + query, { headers }))
        .status,
      400,
      query
    );
  }
  assert.equal(
    (await fetch(base + '/api/v1/dashboard/sessions/not-a-uuid', { headers }))
      .status,
    400
  );
  assert.equal(
    (
      await fetch(base + '/api/v1/dashboard/sessions/' + randomUUID(), {
        headers,
      })
    ).status,
    404
  );
});

test('session details, vote actions, feedback and returning browsers derive from retained records without leaking identities', async () => {
  const ids = [],
    marker = 'Dashboard ' + randomUUID(),
    device = 'private-device-' + randomUUID();
  const now = new Date(),
    earlier = new Date(Date.now() - 40 * 86400000);
  const headers = { Cookie: auth.COOKIE + '=' + (await session()) };
  try {
    const old = await auth.db.room.create({
      data: {
        pin: randomUUID(),
        hostId: 'private-host',
        theme: 'custom:' + marker,
        createdAt: earlier,
        participants: { create: { deviceId: device, createdAt: earlier } },
      },
    });
    ids.push(old.id);
    const room = await auth.db.room.create({
      data: {
        pin: randomUUID(),
        hostId: 'private-host',
        hostDeviceId: device,
        theme: 'custom:' + marker,
        status: 'RESOLVED',
        runtimeState: {
          closed: false,
          secret: 'private-snapshot',
          voting: { expectedCount: 2, matchScore: 50 },
        },
        createdAt: now,
        participants: {
          create: [
            { deviceId: device, budgetCap: 999 },
            { deviceId: 'private-other' },
          ],
        },
        options: {
          create: [
            { name: 'Winner', source: 'USER_CUSTOM' },
            { name: 'Runner-up', source: 'USER_CUSTOM' },
            { name: 'Unvoted', source: 'USER_CUSTOM' },
          ],
        },
      },
      include: { participants: true, options: true },
    });
    ids.push(room.id);
    const [a, b] = room.participants,
      [winner, other] = room.options;
    await auth.db.room.update({
      where: { id: room.id },
      data: { winnerOptionId: winner.id },
    });
    await auth.db.vote.createMany({
      data: [
        { participantId: a.id, optionId: winner.id, score: 2 },
        { participantId: b.id, optionId: winner.id, score: -100 },
        { participantId: a.id, optionId: other.id, score: -1 },
        { participantId: b.id, optionId: other.id, score: 0 },
      ],
    });
    await auth.db.feedback.create({
      data: {
        participantId: a.id,
        optionId: winner.id,
        satisfactionScore: 4,
        priceAccuracyScore: 3,
        comment: '<script>window.bad=1</script>' + 'x'.repeat(600),
      },
    });
    const second = await auth.db.room.create({
      data: {
        pin: randomUUID(),
        hostId: 'private-host',
        theme: 'custom:' + marker,
        runtimeState: { closed: false },
        participants: { create: { deviceId: device } },
      },
    });
    ids.push(second.id);
    async function get(path) {
      const r = await fetch(base + '/api/v1/dashboard' + path, { headers });
      assert.equal(r.status, 200);
      return r.json();
    }
    const list = await get(
      '/sessions?' +
        new URLSearchParams({ search: marker, days: 7, mode: 'custom' })
    );
    assert.equal(list.total, 2);
    assert.equal(list.pageSize, 20);
    assert.equal(list.items.length, 2);
    const item = list.items.find((x) => x.id === room.id);
    assert.equal(item.status, 'completed');
    assert.equal(item.members, 2);
    assert.equal(item.voters, 2);
    assert.equal(item.ratings, 4);
    assert.equal(item.winner, 'Winner');
    assert.equal(
      (
        await get(
          '/sessions?' +
            new URLSearchParams({ search: marker, status: 'setup' })
        )
      ).total,
      1
    );
    assert.equal(
      (
        await get(
          '/sessions?' + new URLSearchParams({ search: marker, page: 2 })
        )
      ).items.length,
      0
    );
    assert.equal(
      (
        await get(
          '/sessions?' + new URLSearchParams({ search: "%' OR 1=1 --" })
        )
      ).total,
      0
    );
    const detail = await get('/sessions/' + room.id);
    assert.equal(detail.topic, marker);
    assert.equal(detail.phase, 'completed');
    assert.equal(detail.expectedVoters, 2);
    assert.equal(detail.matchScore, 50);
    assert.equal(detail.members, 2);
    assert.equal(detail.candidateCount, 3);
    assert.equal(detail.options.length, 3);
    assert.deepEqual(
      detail.options.map(({ name, likes, supers, passes, vetoes, unseen }) => ({
        name,
        likes,
        supers,
        passes,
        vetoes,
        unseen,
      })),
      [
        {
          name: 'Winner',
          likes: 0,
          supers: 1,
          passes: 0,
          vetoes: 1,
          unseen: 0,
        },
        {
          name: 'Runner-up',
          likes: 0,
          supers: 0,
          passes: 1,
          vetoes: 0,
          unseen: 1,
        },
        {
          name: 'Unvoted',
          likes: 0,
          supers: 0,
          passes: 0,
          vetoes: 0,
          unseen: 0,
        },
      ]
    );
    assert.equal(detail.feedback.length, 1);
    assert.equal(detail.feedback[0].satisfaction, 4);
    assert.equal(detail.feedback[0].priceAccuracy, 3);
    assert.equal(detail.feedback[0].comment.length, 500);
    const stats = await get('/analytics?days=7');
    assert.ok(stats.audience.returning >= 1);
    assert.ok(stats.audience.repeatInPeriod >= 1);
    assert.ok(stats.votes.supers >= 1);
    assert.ok(stats.votes.vetoes >= 1);
    assert.ok(stats.summary.medianMinutesToLastBallot >= 0);
    for (const data of [list, detail, stats])
      assert.doesNotMatch(
        JSON.stringify(data),
        /private-device|private-host|private-other|private-snapshot|budgetCap|runtimeState|hostDeviceId|participantId|publicKey/
      );
    for (const [status, runtimeState, expected] of [
      ['VOTING', { closed: false }, 'voting'],
      ['CONFIGURING', { closed: true }, 'inactive'],
      ['CONFIGURING', null, 'legacy'],
    ]) {
      await auth.db.room.update({
        where: { id: second.id },
        data: {
          status,
          runtimeState:
            runtimeState === null
              ? require('@prisma/client').Prisma.DbNull
              : runtimeState,
        },
      });
      assert.equal((await get('/sessions/' + second.id)).phase, expected);
    }
  } finally {
    await auth.db.room.deleteMany({ where: { id: { in: ids } } });
  }
});
