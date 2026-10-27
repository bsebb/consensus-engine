// Explicitly authorized live verification using a disposable virtual authenticator.
// Its credential/session hashes are recorded for strictly scoped post-test cleanup.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (process.env.AUDIT_LIVE_CONFIRM !== 'noyoupick.org') throw new Error('Explicit live-test authorization is required.');
const output = process.env.AUDIT_DASHBOARD_OUTPUT || '/private/tmp/consensus-dashboard-live';
fs.mkdirSync(output, { recursive: true });
const guide = fs.readFileSync(process.env.DASHBOARD_SETUP_FILE, 'utf8');
const setupUrl = guide.match(/https:\/\/www\.noyoupick\.org\/dashboard#setup=[A-Za-z0-9_.-]+/)?.[0];
if (!setupUrl) throw new Error('Supply the private test invitation file.');
const checks = [], pageErrors = [], sessionHashes = new Set();
let credentialId, summary;
function pass(name) { checks.push(name); console.log('PASS ' + name); }
function save() { fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks, pageErrors, credentialId, sessionHashes: [...sessionHashes], summary }, null, 2)); }
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  let page;
  try {
    const context = await browser.newContext({ viewport: { width: 1365, height: 1000 } });
    page = await context.newPage(); page.setDefaultTimeout(25000);
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('request', req => { if (req.url().endsWith('/register/verify')) { credentialId = req.postDataJSON().response.id; save(); } });
    const cdp = await context.newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    const response = await page.goto('https://noyoupick.org/dashboard');
    assert.equal(response.status(), 200); assert.match(response.headers()['x-robots-tag'], /noindex/);
    await page.getByRole('button', { name: 'Sign in with passkey', exact: true }).waitFor();
    assert.equal(await page.evaluate(async () => (await fetch('/api/v1/dashboard/analytics')).status), 401);
    pass('live dashboard address shows only sign-in; private analytics return 401');
    await page.goto(setupUrl);
    await page.getByRole('button', { name: 'Create my passkey', exact: true }).click();
    await page.getByText('How’s it picking?', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Room activity', exact: true }).waitFor();
    assert.ok(!page.url().includes('setup='));
    let cookie = (await context.cookies()).find(c => c.name === '__Host-nyp_dashboard');
    assert.ok(cookie?.httpOnly && cookie.secure && cookie.sameSite === 'Strict');
    sessionHashes.add(createHash('sha256').update(cookie.value).digest('hex')); save();
    summary = await page.evaluate(async () => (await (await fetch('/api/v1/dashboard/analytics?days=30')).json()).summary);
    assert.ok(Number.isInteger(summary.rooms));
    pass('live passkey enrollment, same-origin secure cookie, and aggregate data work');
    await page.screenshot({ path: path.join(output, 'dashboard-live-desktop.png') });
    await page.setViewportSize({ width: 393, height: 852 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(output, 'dashboard-live-mobile.png') });
    await page.getByRole('heading', { name: 'The feedback loop' }).scrollIntoViewIfNeeded();
    if (process.env.AUDIT_RESTART_GATE) {
      const gate = process.env.AUDIT_RESTART_GATE;
      fs.writeFileSync(gate + '.requested', 'ready');
      console.log('READY_FOR_AUTHORIZED_RENDER_RESTART');
      const deadline = Date.now() + Number(process.env.AUDIT_RESTART_TIMEOUT_MS || 1200000);
      while (!fs.existsSync(gate + '.complete')) {
        if (Date.now() > deadline) throw new Error('Restart verification timed out');
        await page.waitForTimeout(1000);
      }
      await page.reload(); await page.getByText('How’s it picking?', { exact: true }).waitFor();
      await page.getByRole('heading', { name: 'Room activity', exact: true }).waitFor();
      pass('owner session survives the actual live Render restart');
    }
    await page.getByLabel('Period').selectOption('7');
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.getByRole('button', { name: 'Refresh', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByRole('button', { name: 'Sign in with passkey', exact: true }).waitFor();
    const oldSession = await fetch('https://www.noyoupick.org/api/v1/dashboard/analytics', { headers: { Cookie: '__Host-nyp_dashboard=' + cookie.value } });
    assert.equal(oldSession.status, 401);
    pass('live date selection, refresh, mobile scrolling, and logout revocation work');
    await page.getByRole('button', { name: 'Sign in with passkey', exact: true }).click();
    await page.getByText('How’s it picking?', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Room activity', exact: true }).waitFor();
    cookie = (await context.cookies()).find(c => c.name === '__Host-nyp_dashboard');
    sessionHashes.add(createHash('sha256').update(cookie.value).digest('hex')); save();
    assert.deepEqual(pageErrors, []);
    pass('registered passkey signs back in with zero unhandled browser exceptions');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  } catch (e) {
    checks.push('FAIL ' + e.message); console.error(e.stack);
    if (page) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    process.exitCode = 1;
  } finally { await browser.close(); save(); }
})();
