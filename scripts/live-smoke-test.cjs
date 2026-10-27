// Explicitly authorized live smoke test. Creates only its own labeled test rooms; no database fault injection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const browserEngine = require(process.env.PLAYWRIGHT_MODULE || 'playwright')[process.env.AUDIT_BROWSER || 'chromium'];
const base = 'https://noyoupick.org';
if (process.env.AUDIT_LIVE_CONFIRM !== 'noyoupick.org') throw new Error('Set AUDIT_LIVE_CONFIRM=noyoupick.org to explicitly authorize live test room creation.');
const output = process.env.AUDIT_OUTPUT || '/private/tmp/consensus-live-smoke';
fs.mkdirSync(output, { recursive: true });
const failures = [];
const passes = [];
const pageErrors = [];
let current;
const createdRooms = [];
function pass(name) { passes.push(name); console.log(`PASS ${name}`); }
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Page overflows horizontally');
}
async function voteAll(page) {
  await page.getByRole('button', { name: 'Like', exact: true }).waitFor();
  for (let i = 0; i < 13; i++) {
    const like = page.getByRole('button', { name: 'Like', exact: true });
    if (!await like.count()) break;
    await like.click();
    await page.waitForTimeout(220);
  }
  assert.equal(await page.getByRole('button', { name: 'Like', exact: true }).count(), 0, 'All cards must be voted');
}
(async () => {
  const browser = await browserEngine.launch({ headless: true, ...(process.env.AUDIT_BROWSER !== 'webkit' && process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  const contexts = [];
  const newPage = async (name, width = 393, height = 852) => {
    // Keep fault injection deterministic: service-worker requests bypass Playwright routes.
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500 });
    contexts.push(ctx);
    const page = await ctx.newPage();
    page.setDefaultTimeout(25000);
    page.on('response', async response => {
      if (response.status() === 201 && response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/rooms') {
        try { const room = await response.json(); createdRooms.push({ id: room.room_id, pin: room.pin }); } catch {}
      }
    });
    page.on('pageerror', e => pageErrors.push(`${name}: ${e.message}`));
    return page;
  };
  try {
    const host = await newPage('host'); current = host;
    await host.goto(base);
    await host.getByPlaceholder('e.g. Alex (optional)').fill('Live Check Host');
    await noOverflow(host);
    const theme = host.getByRole('switch', { name: /Switch to Dark|Switch to Light/ });
    const themeLabel = await theme.getAttribute('aria-label'); await theme.click();
    assert.notEqual(await theme.getAttribute('aria-label'), themeLabel);
    await host.getByRole('button', { name: 'Create Room', exact: true }).click();
    await host.waitForURL(/\/lobby\/\d{4}/);
    const pin = new URL(host.url()).pathname.split('/').pop();
    await host.getByRole('button', { name: /Start Voting/ }).waitFor();
    await noOverflow(host);
    pass('mobile discovery creation, theme and lobby layout');
    const guest = await newPage('guest', 1280, 900); current = guest;
    await guest.goto(`${base}/j/${pin}`);
    await guest.getByPlaceholder('e.g. Alex (optional)').fill('Live Check Guest');
    const pinInputs = guest.locator('input[inputmode="numeric"]');
    assert.equal((await pinInputs.evaluateAll(es => es.map(e => e.value).join(''))), pin);
    await guest.getByRole('button', { name: 'Join Room', exact: true }).click();
    await guest.waitForURL(/\/lobby\/\d{4}/);
    await host.getByText('Live Check Guest', { exact: true }).waitFor();
    await guest.getByText(/^Live Check Host,?$/).waitFor();
    await noOverflow(guest);
    assert.equal(await guest.getByRole('button', { name: /Start Voting/ }).count(), 0);
    // Host reload must preserve host rights and the two-person roster.
    current = host; await host.reload();
    await host.getByRole('button', { name: /Start Voting/ }).waitFor();
    await host.getByText('Live Check Guest', { exact: true }).waitFor();
    pass('invite code join, synchronized roster, guest controls and host reload');
    await host.waitForTimeout(400);
    await host.screenshot({ path: path.join(output, 'discovery-lobby-mobile.png'), fullPage: true });
    const beforeCount = Number((await host.getByRole('button', { name: /Start Voting/ }).innerText()).match(/\d+/)?.[0]);
    await host.getByRole('button', { name: 'Add Place', exact: true }).click();
    await host.waitForTimeout(250);
    const afterCount = Number((await host.getByRole('button', { name: /Start Voting/ }).innerText()).match(/\d+/)?.[0]);
    assert.ok(afterCount > beforeCount, 'Add Place must add an actual candidate');
    await host.getByRole('button', { name: /Start Voting/ }).click();
    await Promise.all([host.waitForURL(/\/deck\//), guest.waitForURL(/\/deck\//)]);
    await host.getByRole('button', { name: 'Like', exact: true }).waitFor();
    await host.getByRole('button', { name: 'Toggle venue details' }).click();
    await host.getByRole('link', { name: /Directions|Navigate|Google Maps/i }).first().waitFor();
    await host.getByRole('button', { name: 'Close Details', exact: true }).click();
    await host.waitForTimeout(400);
    await host.screenshot({ path: path.join(output, 'discovery-voting-mobile.png'), fullPage: true });
    await host.getByRole('button', { name: 'Back to Lobby or Leave' }).click();
    await host.getByRole('button', { name: /Return to Lobby/ }).click();
    await host.waitForURL(/\/lobby\//);
    await host.waitForTimeout(300);
    assert.match(host.url(), /\/lobby\//);
    await host.getByRole('button', { name: /Resume/ }).last().click();
    await host.waitForURL(/\/deck\//);
    pass('candidate addition, synchronized voting start, details and pause/resume');
    if (process.env.AUDIT_RESTART_GATE) {
      await host.getByRole('button', { name: 'Like', exact: true }).click();
      await host.waitForTimeout(300);
      assert.equal(await host.evaluate(pin => JSON.parse(localStorage.getItem(`ballot:${pin}`) || '[]').length, pin), 1);
      await voteAll(guest);
      await guest.getByText(/Waiting for your friends/).waitFor();
      const gate = process.env.AUDIT_RESTART_GATE;
      fs.writeFileSync(gate + '.requested', JSON.stringify({ pin, createdRooms }));
      console.log('READY_FOR_AUTHORIZED_RENDER_RESTART');
      const deadline = Date.now() + Number(process.env.AUDIT_RESTART_TIMEOUT_MS || 1200000);
      while (!fs.existsSync(gate + '.complete')) {
        if (Date.now() > deadline) throw new Error('Live restart verification timed out');
        await host.waitForTimeout(1000);
      }
      await Promise.all([host.goto(`${base}/deck/${pin}`), guest.goto(`${base}/deck/${pin}`)]);
      await guest.getByText(/Waiting for your friends/).waitFor();
      await host.getByRole('button', { name: 'Like', exact: true }).waitFor();
      assert.equal(await host.evaluate(pin => JSON.parse(localStorage.getItem(`ballot:${pin}`) || '[]').length, pin), 1);
      pass('live Render restart preserves the partial host ballot, submitted guest ballot and unfinished deck');
      await voteAll(host);
    } else {
      await voteAll(host);
      await host.getByText(/Waiting for your friends/).waitFor();
      current = guest; await voteAll(guest);
    }
    const winnerHeading = page => page.getByRole('button', { name: 'Start Another Pick', exact: true });
    await Promise.all([winnerHeading(host).waitFor(), winnerHeading(guest).waitFor()]);
    const winnerName = await host.locator('h2').first().innerText();
    assert.equal(await guest.locator('h2').first().innerText(), winnerName);
    await host.getByText('2 of 2 liked · 0 vetoes', { exact: true }).first().waitFor();
    current = host; await host.reload();
    await winnerHeading(host).waitFor();
    await host.getByText('2 of 2 liked · 0 vetoes', { exact: true }).first().waitFor();
    assert.equal(await host.locator('h2').first().innerText(), winnerName);
    await noOverflow(host);
    await host.waitForTimeout(400);
    await host.screenshot({ path: path.join(output, 'discovery-winner-mobile.png'), fullPage: true });
    pass('two-user ballots, waiting quorum, identical winner and complete reload recovery');
    // A rejected review must stay editable and must not claim to be saved.
    await host.locator('details').last().locator('summary').click();
    await host.getByRole('button', { name: 'Full Form', exact: true }).click();
    const review = host.getByRole('dialog', { name: 'Session Feedback' });
    await host.route('**/feedback', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"success":false}' }));
    await review.getByRole('button', { name: 'Submit Feedback', exact: true }).click();
    await review.getByRole('alert').waitFor();
    assert.equal(await review.getByRole('button', { name: 'Submit Feedback', exact: true }).count(), 1);
    await host.unroute('**/feedback');
    const saved = host.waitForResponse(r => r.url().endsWith('/feedback') && r.request().method() === 'POST');
    await review.getByRole('button', { name: 'Submit Feedback', exact: true }).click();
    assert.equal((await saved).status(), 200);
    await review.waitFor({ state: 'hidden' });
    pass('simulated review failure stays editable; real retry persists successfully');
    // Rematch must change both users to the same ranked runner-up without reswiping.
    const guestBefore = await guest.locator('h2').first().innerText();
    await host.getByRole('button', { name: /Runner.Up Rematch/i }).click();
    await guest.waitForFunction(previous => document.querySelector('h2')?.innerText !== previous, guestBefore);
    assert.equal(await host.locator('h2').first().innerText(), await guest.locator('h2').first().innerText());
    pass('host rematch synchronizes the ranked runner-up across both browsers');
    // History contains this completed room.
    const historyName = await host.locator('h2').first().innerText();
    await host.goto(`${base}/history`);
    await host.getByText(historyName, { exact: false }).first().waitFor();
    pass('completed result saved to history');
    await host.locator('button[aria-expanded]').first().click();
    await host.getByRole('button', { name: 'Winner Screen', exact: true }).click();
    await winnerHeading(host).waitFor();
    assert.equal(await host.locator('h2').first().innerText(), historyName);
    pass('history reopens the saved winner screen');

    const custom = await newPage('custom'); current = custom;
    await custom.goto(base);
    await custom.getByRole('button', { name: 'Custom Poll Your own ideas' }).click();
    await custom.getByRole('button', { name: /Board Games/ }).click();
    await custom.getByRole('button', { name: /Create Room \(4\)/ }).click();
    await custom.waitForURL(/\/lobby\/\d{4}/);
    await custom.getByRole('button', { name: /Start Voting/ }).click();
    await custom.waitForURL(/\/deck\//);
    await voteAll(custom);
    await winnerHeading(custom).waitFor();
    await custom.getByText('1 of 1 liked · 0 vetoes', { exact: true }).first().waitFor();
    await custom.reload();
    await winnerHeading(custom).waitFor();
    await noOverflow(custom);
    await custom.waitForTimeout(400);
    await custom.screenshot({ path: path.join(output, 'custom-winner-mobile.png'), fullPage: true });
    pass('custom poll starter pack, solo server consensus and winner reload');
    assert.deepEqual(pageErrors, [], 'No unhandled browser exceptions');
    pass('zero unhandled browser exceptions');
  } catch (e) {
    failures.push(e.stack);
    console.error(e.stack);
    if (current) { await current.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }); console.error('BODY', (await current.locator('body').innerText()).slice(0,6000)); }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ target: base, browser: process.env.AUDIT_BROWSER || "chromium", createdRooms, passes, failures, pageErrors }, null, 2));
  }
  if (failures.length) process.exitCode = 1;
})();
