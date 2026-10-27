// Local, disposable-database passkey and cross-process dashboard rehearsal.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  net = require('node:net');
const { fork, execFileSync } = require('node:child_process');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const { Client } = require('../server/node_modules/pg');
const root = path.resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const checks = [];
const children = [];
const pageErrors = [];
const output =
  process.env.AUDIT_DASHBOARD_OUTPUT ||
  '/private/tmp/consensus-dashboard-browser';
fs.mkdirSync(output, { recursive: true });
const pass = (name) => {
  checks.push(name);
  console.log('PASS ' + name);
};
async function port() {
  const s = net.createServer();
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const p = s.address().port;
  await new Promise((r) => s.close(r));
  return p;
}
async function child(file, env) {
  const c = fork(path.join(root, file), [], {
    execArgv: [],
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  children.push(c);
  let logs = '';
  c.stdout.on('data', (x) => (logs = (logs + x).slice(-2000)));
  c.stderr.on('data', (x) => (logs = (logs + x).slice(-2000)));
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(Error('Startup timed out: ' + logs)),
      15000
    );
    c.once('message', (m) => {
      clearTimeout(t);
      resolve({ child: c, ...m });
    });
    c.once('exit', (code) => {
      if (code) {
        clearTimeout(t);
        reject(Error('Startup failed: ' + logs));
      }
    });
  });
}
async function stop(c) {
  if (c.exitCode !== null || c.signalCode) return;
  await new Promise((r) => {
    c.once('exit', r);
    c.kill('SIGKILL');
  });
}
(async () => {
  const { default: EmbeddedPostgres } = await import(
    process.env.EMBEDDED_POSTGRES_MODULE || 'embedded-postgres'
  );
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'consensus-dashboard-test-')
  );
  const dbPort = await port(),
    webPort = await port();
  const url = `postgresql://dashboard_test:local-only@127.0.0.1:${dbPort}/consensus_dashboard_test`;
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(dir, 'data'),
    user: 'dashboard_test',
    password: 'local-only',
    port: dbPort,
    persistent: true,
    postgresFlags: ['-h', '127.0.0.1'],
    onLog: () => {},
    onError: () => {},
  });
  let browser, client;
  try {
    await pg.initialise();
    await pg.start();
    await pg.createDatabase('consensus_dashboard_test');
    execFileSync(
      path.join(root, 'server/node_modules/.bin/prisma'),
      [
        'migrate',
        'deploy',
        '--schema',
        path.join(root, 'server/prisma/schema.prisma'),
      ],
      { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' }
    );
    client = new Client({ connectionString: url });
    await client.connect();
    const setupToken = Date.now() + '.' + randomBytes(32).toString('base64url');
    await client.query(
      'UPDATE dashboard_owner SET "setupTokenHash"=$1 WHERE id=\'owner\'',
      [createHash('sha256').update(setupToken).digest('hex')]
    );
    for (let i = 0; i < 10; i++) {
      const id = randomUUID(),
        person = randomUUID();
      await client.query(
        'INSERT INTO rooms (id,pin,"hostId",status,theme,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW()-$6*interval \'1 day\',NOW())',
        [
          id,
          String(1000 + i),
          person,
          i < 7 ? 'RESOLVED' : 'CONFIGURING',
          i % 2 ? 'restaurants' : 'custom:Board games',
          i % 6,
        ]
      );
      const option = randomUUID();
      await client.query(
        'INSERT INTO options (id,"roomId",name,source,"updatedAt") VALUES ($1,$2,$3,\'USER_CUSTOM\',NOW())',
        [option, id, ['Azul', 'Pao Pao', 'Catan'][i % 3]]
      );
      await client.query(
        'INSERT INTO participants (id,"roomId","deviceId","updatedAt") VALUES ($1,$2,$3,NOW())',
        [person, id, randomUUID()]
      );
      if (i < 7) {
        await client.query('UPDATE rooms SET "winnerOptionId"=$1 WHERE id=$2', [
          option,
          id,
        ]);
        await client.query(
          'INSERT INTO votes (id,"participantId","optionId",score,"updatedAt") VALUES ($1,$2,$3,1,NOW())',
          [randomUUID(), person, option]
        );
      }
    }
    const origin = `http://localhost:${webPort}`;
    const env = {
      TEST_DATABASE_URL: url,
      DASHBOARD_ORIGIN: origin,
      TEST_RATE_LIMIT_NAMESPACE: 'dashboard-browser-' + randomUUID(),
    };
    const one = await child('server/test-support/clusterChild.js', env),
      two = await child('server/test-support/clusterChild.js', env);
    let front = await child('server/test-support/productionFrontend.js', {
      TEST_BACKEND_URL: one.url,
      TEST_FRONTEND_PORT: String(webPort),
    });
    browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
        : {}),
    });
    const context = await browser.newContext({
      viewport: { width: 1365, height: 1000 },
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.setDefaultTimeout(15000);
    const cdp = await context.newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });
    await page.goto(origin + '/dashboard');
    await page
      .getByRole('button', { name: 'Sign in with passkey', exact: true })
      .waitFor();
    assert.equal(
      await page.getByText('How’s it picking?', { exact: true }).count(),
      0
    );
    pass('dashboard address exposes only the login screen');
    await page.goto(origin + '/dashboard#setup=' + setupToken);
    await page
      .getByRole('button', { name: 'Create my passkey', exact: true })
      .click();
    await page.getByText('How’s it picking?', { exact: true }).waitFor();
    await page
      .getByRole('heading', { name: 'Room activity', exact: true })
      .waitFor();
    assert.ok(!page.url().includes('setup='));
    assert.equal(
      (
        await client.query(
          'SELECT enrolled,"setupTokenHash" FROM dashboard_owner'
        )
      ).rows[0].setupTokenHash,
      null
    );
    assert.equal(
      (await client.query('SELECT count(*)::int n FROM dashboard_credentials'))
        .rows[0].n,
      1
    );
    const cookies = await context.cookies();
    const session = cookies.find((x) => x.name === '__Host-nyp_dashboard');
    assert.ok(
      session?.httpOnly && session.secure && session.sameSite === 'Strict'
    );
    pass(
      'real WebAuthn enrollment verifies a user-verified credential and issues a protected session cookie'
    );
    await page.screenshot({
      path: path.join(output, 'dashboard-desktop.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 393, height: 852 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      )
    );
    await page.screenshot({
      path: path.join(output, 'dashboard-mobile.png'),
      fullPage: true,
    });
    await page
      .getByRole('heading', { name: 'The feedback loop' })
      .scrollIntoViewIfNeeded();
    assert.ok(
      (
        await page
          .getByRole('heading', { name: 'The feedback loop' })
          .boundingBox()
      ).y < 852
    );
    await page.setViewportSize({ width: 1365, height: 1000 });
    await stop(front.child);
    front = await child('server/test-support/productionFrontend.js', {
      TEST_BACKEND_URL: two.url,
      TEST_FRONTEND_PORT: String(webPort),
    });
    await page.reload();
    await page.getByText('How’s it picking?', { exact: true }).waitFor();
    await page
      .getByRole('heading', { name: 'Room activity', exact: true })
      .waitFor();
    pass(
      'the same owner cookie authenticates through a separate backend process'
    );
    await page.getByLabel('Period').selectOption('7');
    await page
      .getByRole('heading', { name: 'Room activity', exact: true })
      .waitFor();
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.getByRole('button', { name: 'Refresh', exact: true }).waitFor();
    pass('aggregate metrics, date range, refresh and mobile layout work');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page
      .getByRole('button', { name: 'Sign in with passkey', exact: true })
      .waitFor();
    const revoked = await fetch(one.url + '/api/v1/dashboard/analytics', {
      headers: { Cookie: '__Host-nyp_dashboard=' + session.value },
    });
    assert.equal(revoked.status, 401);
    pass('logout revokes the session across both processes');
    let assertion;
    page.on('request', (req) => {
      if (req.url().endsWith('/login/verify')) assertion = req.postDataJSON();
    });
    await page
      .getByRole('button', { name: 'Sign in with passkey', exact: true })
      .click();
    await page.getByText('How’s it picking?', { exact: true }).waitFor();
    assert.ok(assertion);
    pass('registered passkey signs back in through the second process');
    const replay = await page.evaluate(async (body) => {
      const r = await fetch('/api/v1/dashboard/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return r.status;
    }, assertion);
    assert.equal(replay, 400);
    pass('a signed assertion cannot replay its consumed challenge');
    const noOwner = await page.evaluate(async (setupToken) => {
      const r = await fetch('/api/v1/dashboard/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupToken }),
      });
      return r.status;
    }, setupToken);
    assert.equal(noOwner, 403);
    pass('initial setup capability is invalid after enrollment');
    const bad = await fetch(one.url + '/api/v1/dashboard/logout', {
      method: 'POST',
      headers: {
        Origin: 'https://attacker.invalid',
        'Content-Type': 'application/json',
        Cookie: '__Host-nyp_dashboard=' + session.value,
      },
      body: '{}',
    });
    assert.equal(bad.status, 403);
    assert.deepEqual(pageErrors, []);
    pass('cross-origin mutations fail and no unhandled browser errors occur');
  } catch (e) {
    console.error(e.stack);
    process.exitCode = 1;
    checks.push('FAIL ' + e.message);
  } finally {
    await browser?.close();
    await Promise.all(children.map(stop));
    await client?.end();
    await pg.stop().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
    fs.writeFileSync(
      path.join(output, 'results.json'),
      JSON.stringify({ checks, pageErrors }, null, 2)
    );
  }
})().catch((e) => {
  console.error(e.stack);
  process.exitCode = 1;
});
