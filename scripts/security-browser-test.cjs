// Run only against an isolated local app and test database (see docs/SECURITY_AND_FLOW_AUDIT.md).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const browserEngine = require(process.env.PLAYWRIGHT_MODULE || 'playwright')[process.env.AUDIT_BROWSER || 'chromium'];
const base = process.env.AUDIT_APP_URL || 'http://127.0.0.1:5174';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Browser audit only permits a local test app.');
const output = process.env.AUDIT_OUTPUT || '/private/tmp/consensus-browser-audit';
fs.mkdirSync(output, { recursive: true });
const failures = [];
const passes = [];
const pageErrors = [];
let current;
let faultDatabase;
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
    const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500 });
    contexts.push(ctx);
    const page = await ctx.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', e => pageErrors.push(`${name}: ${e.message}`));
    return page;
  };
  try {
    const host = await newPage('host'); current = host;
    await host.goto(base);
    await host.getByPlaceholder('e.g. Alex (optional)').fill('Audit Host');
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
    await guest.getByPlaceholder('e.g. Alex (optional)').fill('Audit Guest');
    const pinInputs = guest.locator('input[inputmode="numeric"]');
    assert.equal((await pinInputs.evaluateAll(es => es.map(e => e.value).join(''))), pin);
    await guest.getByRole('button', { name: 'Join Room', exact: true }).click();
    await guest.waitForURL(/\/lobby\/\d{4}/);
    await host.getByText('Audit Guest', { exact: true }).waitFor();
    await guest.getByText(/^Audit Host,?$/).waitFor();
    await noOverflow(guest);
    assert.equal(await guest.getByRole('button', { name: /Start Voting/ }).count(), 0);
    // Host reload must preserve host rights and the two-person roster.
    current = host; await host.reload();
    await host.getByRole('button', { name: /Start Voting/ }).waitFor();
    await host.getByText('Audit Guest', { exact: true }).waitFor();
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
    await voteAll(host);
    await host.getByText(/Waiting for your friends/).waitFor();
    current = guest; await voteAll(guest);
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
    if (process.env.AUDIT_REAL_FAILURE === 'true') {
      require('../server/test-support/testEnvironment');
      faultDatabase = require('../server/db/prismaClient').prisma;
      await faultDatabase.$executeRawUnsafe("CREATE OR REPLACE FUNCTION audit_fail_feedback() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.comment = 'audit-simulated-save-error' THEN RAISE EXCEPTION 'injected save failure'; END IF; RETURN NEW; END $$");
      await faultDatabase.$executeRawUnsafe('CREATE TRIGGER audit_fail_feedback_write BEFORE INSERT OR UPDATE ON feedbacks FOR EACH ROW EXECUTE FUNCTION audit_fail_feedback()');
      await review.locator('textarea').fill('audit-simulated-save-error');
    } else await host.route('**/feedback', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"success":false}' }));
    await review.getByRole('button', { name: 'Submit Feedback', exact: true }).click();
    await review.getByRole('alert').waitFor();
    assert.equal(await review.getByRole('button', { name: 'Submit Feedback', exact: true }).count(), 1);
    if (faultDatabase) {
      await faultDatabase.$executeRawUnsafe('DROP TRIGGER audit_fail_feedback_write ON feedbacks');
      await faultDatabase.$executeRawUnsafe('DROP FUNCTION audit_fail_feedback()');
      await review.locator('textarea').fill('Saved after a database failure');
    } else await host.unroute('**/feedback');
    const saved = host.waitForResponse(r => r.url().endsWith('/feedback') && r.request().method() === 'POST');
    await review.getByRole('button', { name: 'Submit Feedback', exact: true }).click();
    assert.equal((await saved).status(), 200);
    await review.waitFor({ state: 'hidden' });
    pass('review failure stays editable; retry persists the review successfully');
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
    if (faultDatabase) {
      await faultDatabase.$executeRawUnsafe('DROP TRIGGER IF EXISTS audit_fail_feedback_write ON feedbacks').catch(() => {});
      await faultDatabase.$executeRawUnsafe('DROP FUNCTION IF EXISTS audit_fail_feedback()').catch(() => {});
      await faultDatabase.$disconnect();
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ passes, failures, pageErrors }, null, 2));
  }
  if (failures.length) process.exitCode = 1;
})();
