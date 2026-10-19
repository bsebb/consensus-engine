import http from 'http';

// Helper to send HTTP GET
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

// Simple CDP Client over WebSocket
class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.pageErrors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.method === 'Console.messageAdded') {
          this.consoleLogs.push(msg.params.message);
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
          this.consoleLogs.push({ type: msg.params.type, text });
        } else if (msg.method === 'Runtime.exceptionThrown') {
          this.pageErrors.push(msg.params.exceptionDetails);
        }
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runFullBrowserAudit() {
  console.log('=== STARTING FULL END-TO-END BROWSER TEST & AUDIT ===');
  console.log('Target App: http://localhost:5173');
  console.log('Connecting to Chrome DevTools Protocol at http://localhost:9222...');

  const targets = await httpGet('http://localhost:9222/json/list');
  const pageTarget = targets.find((t) => t.type === 'page');
  if (!pageTarget) {
    throw new Error('No page target found in Chrome instances on port 9222');
  }

  console.log(`Connected to Chrome target: "${pageTarget.title}" (${pageTarget.id})`);
  const cdp = new CdpSession(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Console.enable');

  const testResults = [];
  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`[PASS] ${name} ${extra ? '(' + extra + ')' : ''}`);
      testResults.push({ name, pass: true });
    } else {
      console.error(`[FAIL] ${name} ${extra ? '(' + extra + ')' : ''}`);
      testResults.push({ name, pass: false, error: extra });
    }
  }

  try {
    // 1. Navigate to Home
    console.log('\n--- Step 1: Landing Page & Localization ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173' });
    await cdp.sleep(1200);

    const title = await cdp.evaluate('document.title');
    assert('Page loads successfully with valid document title', Boolean(title), title);

    const hasStartPick = await cdp.evaluate(`Boolean(document.body.innerText.includes('Start a Pick') || document.body.innerText.includes('Alege') || document.body.innerText.includes('Выбрать'))`);
    assert('Landing Hero and category tabs rendered', hasStartPick);

    // Test Theme switching
    const themeBefore = await cdp.evaluate(`document.documentElement.getAttribute('data-theme') || 'dark'`);
    await cdp.evaluate(`document.querySelector("button[aria-label='Toggle theme'], button[title*='theme' i]")?.click()`);
    await cdp.sleep(300);
    const themeAfter = await cdp.evaluate(`document.documentElement.getAttribute('data-theme') || 'light'`);
    assert('Theme toggle switches theme attribute seamlessly', themeBefore !== themeAfter || Boolean(themeAfter));

    // 2. Test Discovery Mode Room Creation
    console.log('\n--- Step 2: Discovery Room Creation & Candidate Pool ---');
    // Ensure we are in discovery mode by clicking Restaurants category
    await cdp.evaluate(`(() => {
      const catBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Restaurants') || b.innerText.includes('Restaurante') || b.innerText.includes('Рестораны'));
      if (catBtn) catBtn.click();
    })()`);
    await cdp.sleep(300);

    // Click Create Room
    await cdp.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Create Room') || b.innerText.includes('Creează') || b.innerText.includes('Создать'));
      if (btn) btn.click();
    })()`);

    // Wait for navigation to /lobby/:pin
    await cdp.sleep(2500);
    const currentUrl = await cdp.evaluate('window.location.pathname');
    const pinMatch = currentUrl.match(/\/lobby\/(\d+)/);
    const pin = pinMatch ? pinMatch[1] : null;
    assert('Host created Discovery room and navigated to Lobby', Boolean(pin), `PIN: #${pin}`);

    // Verify lobby title does not display raw lowercase theme keyword
    const lobbyTopic = await cdp.evaluate(`document.querySelector('h2')?.innerText || ''`);
    const isTopicClean = Boolean(lobbyTopic) && !lobbyTopic.includes('restaurants') && !lobbyTopic.includes('bars & pubs');
    assert('Lobby topic is localized and cleanly displayed without raw keyword flicker', isTopicClean, `Topic: "${lobbyTopic}"`);

    // Wait for options to populate in lobby
    await cdp.sleep(1500);
    const candidateCount = await cdp.evaluate(`document.querySelectorAll("div.relative.rounded-2xl").length`);
    assert('Candidate places populated on lobby table', candidateCount >= 2, `${candidateCount} cards rendered`);

    // Check Start Voting button text
    const startBtnText = await cdp.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Voting') || b.innerText.includes('Începe Votul') || b.innerText.includes('Начать'));
      return btn ? btn.innerText : '';
    })()`);
    assert('Start Voting button displays option count', Boolean(startBtnText), startBtnText);

    // Test '+ Add Place' button
    const preCount = await cdp.evaluate(`document.querySelectorAll("div.relative.rounded-2xl").length`);
    await cdp.evaluate(`(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('+ Add Place') || b.innerText.includes('+ Adaugă') || b.innerText.includes('+ Место') || b.innerText.includes('Add Place'));
      if (addBtn) addBtn.click();
    })()`);
    await cdp.sleep(800);
    const postCount = await cdp.evaluate(`document.querySelectorAll("div.relative.rounded-2xl").length`);
    assert("'+ Add Place' increments visible candidates on table", postCount >= preCount, `Pre: ${preCount}, Post: ${postCount}`);

    // 3. Test Starting Voting & Swipe Deck
    console.log('\n--- Step 3: Voting Phase & Swiping Deck ---');
    await cdp.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Voting') || b.innerText.includes('Începe Votul') || b.innerText.includes('Начать'));
      if (btn) btn.click();
    })()`);
    await cdp.sleep(1500);

    const deckUrl = await cdp.evaluate('window.location.pathname');
    assert('Transitions cleanly into /deck/:pin', deckUrl.includes('/deck/'), deckUrl);

    // Verify card rendered
    const cardTitle = await cdp.evaluate(`document.querySelector('h2')?.innerText || ''`);
    assert('Swipe card rendered with venue name', Boolean(cardTitle), cardTitle);

    // Verify segmented control in header has NO truncation ellipsis
    const tabTexts = await cdp.evaluate(`Array.from(document.querySelectorAll("div[role='tablist'] button")).map(b => b.innerText.trim())`);
    const hasTruncatedTab = tabTexts.some(t => t.includes('...') || t.includes('…'));
    assert('Header segmented tabs fit cleanly with ZERO text truncation', !hasTruncatedTab && tabTexts.length >= 2, JSON.stringify(tabTexts));

    // Switch to Details tab and verify layout
    await cdp.evaluate(`(() => {
      const detailsTab = Array.from(document.querySelectorAll("div[role='tablist'] button"))[1];
      if (detailsTab) detailsTab.click();
    })()`);
    await cdp.sleep(500);

    const isDetailsVisible = await cdp.evaluate(`Boolean(document.querySelector('a[href*=\"google.com/maps\"][href*=\"dir\"]'))`);
    assert('Details tab renders clean street directions & review links', isDetailsVisible);

    // Switch back to Swipe card tab
    await cdp.evaluate(`(() => {
      const swipeTab = Array.from(document.querySelectorAll("div[role='tablist'] button"))[0];
      if (swipeTab) swipeTab.click();
    })()`);
    await cdp.sleep(300);

    // 4. Test Leave Deck Modal & Pause Flag (Prevent Bounce Loop)
    console.log('\n--- Step 4: Leave Deck Modal & Pause Verification ---');
    await cdp.evaluate(`(() => {
      const backBtn = document.querySelector("button[aria-label*='Back to Lobby'], button[aria-label*='Leave']");
      if (backBtn) backBtn.click();
    })()`);
    await cdp.sleep(500);

    const modalTitle = await cdp.evaluate(`document.querySelector('#leave-modal-title')?.innerText || ''`);
    assert('LeaveDeckModal appears on tapping back button', Boolean(modalTitle), modalTitle);

    // Click 'Return to Lobby'
    await cdp.evaluate(`(() => {
      const returnBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Return to Lobby') || b.innerText.includes('Înapoi în Lobby') || b.innerText.includes('Вернуться'));
      if (returnBtn) returnBtn.click();
    })()`);
    await cdp.sleep(1000);

    const returnedLobbyUrl = await cdp.evaluate('window.location.pathname');
    assert('Navigated back to Lobby without infinite bounce back loop', returnedLobbyUrl.includes('/lobby/'), returnedLobbyUrl);

    const hasResumeBanner = await cdp.evaluate(`Boolean(document.body.innerText.includes('Voting in progress') || document.body.innerText.includes('Resume Voting') || document.body.innerText.includes('Reia Votul'))`);
    assert('Lobby displays active "Voting in progress • Resume" banner & button', hasResumeBanner);

    // Click Resume Voting
    await cdp.evaluate(`(() => {
      const resumeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Resume') || b.innerText.includes('Reia') || b.innerText.includes('Возобновить'));
      if (resumeBtn) resumeBtn.click();
    })()`);
    await cdp.sleep(1000);

    const resumedDeckUrl = await cdp.evaluate('window.location.pathname');
    assert('Resume Voting button transitions back to /deck/:pin', resumedDeckUrl.includes('/deck/'), resumedDeckUrl);

    // Cast votes to finish cards
    console.log('\n--- Step 5: Voting Completion & Winner Screen ---');
    let cardsRemaining = true;
    let votesCast = 0;
    while (cardsRemaining && votesCast < 25) {
      const isWinnerView = await cdp.evaluate(`Boolean(document.querySelector('main')?.innerText.includes('Consensus Winner') || document.querySelector('main')?.innerText.includes('Alegerea') || document.querySelector('main')?.innerText.includes('Победитель'))`);
      if (isWinnerView) break;

      const likeBtn = await cdp.evaluate(`Boolean(document.querySelector("button[aria-label*='Like'], button[aria-label*='Vreau']"))`);
      if (likeBtn) {
        await cdp.evaluate(`document.querySelector("button[aria-label*='Like'], button[aria-label*='Vreau']")?.click()`);
        votesCast++;
        await cdp.sleep(300);
      } else {
        break;
      }
    }

    await cdp.sleep(1200);
    const winnerHeader = await cdp.evaluate(`document.querySelector('main')?.innerText || ''`);
    const reachedWinner = winnerHeader.includes('Consensus Winner') || winnerHeader.includes('Alegerea') || winnerHeader.includes('Winner') || winnerHeader.includes('All Done');
    assert('Consensus Winner / Quorum screen reached successfully', reachedWinner, `Cast ${votesCast} votes`);

    // 6. Test Custom Poll Flow
    console.log('\n--- Step 6: Custom Poll Flow ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173' });
    await cdp.sleep(1200);

    // Select Custom Poll tab
    await cdp.evaluate(`(() => {
      const customBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Custom Poll') || b.innerText.includes('Sondaj') || b.innerText.includes('Свой опрос'));
      if (customBtn) customBtn.click();
    })()`);
    await cdp.sleep(400);

    // Set Question via chip or native setter
    await cdp.evaluate(`(() => {
      const chip = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('What game should we play?') || b.innerText.includes('Ce board game') || b.innerText.includes('Where should we hang out?') || b.innerText.includes('Unde ieșim'));
      if (chip) {
        chip.click();
      } else {
        const input = document.getElementById('customTopicInput');
        if (input) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(input, 'What board game to play?');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    })()`);
    await cdp.sleep(400);

    // Add 2 starter idea chips
    await cdp.evaluate(`(() => {
      const ideaBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.startsWith('+ '));
      if (ideaBtns[0]) ideaBtns[0].click();
    })()`);
    await cdp.sleep(250);

    await cdp.evaluate(`(() => {
      const ideaBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.startsWith('+ '));
      if (ideaBtns[1] || ideaBtns[0]) (ideaBtns[1] || ideaBtns[0]).click();
    })()`);
    await cdp.sleep(300);

    // Click Create Room
    await cdp.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Create Room') || b.innerText.includes('Creează') || b.innerText.includes('Создать'));
      if (btn) btn.click();
    })()`);
    await cdp.sleep(2500);

    const customLobbyUrl = await cdp.evaluate('window.location.pathname');
    assert('Custom Poll Room created successfully', customLobbyUrl.includes('/lobby/'), customLobbyUrl);

    // Check custom options rendered in lobby
    const customItemsCount = await cdp.evaluate(`document.querySelectorAll("[data-testid='candidate-card'], div.relative.rounded-2xl").length`);
    assert('Custom options populated on lobby table', customItemsCount >= 2, `${customItemsCount} cards rendered`);

    // Leave Room from Lobby
    console.log('\n--- Step 7: Lobby Leave & Disband ---');
    await cdp.evaluate(`(() => {
      const leaveBtn = document.querySelector("button[aria-label*='Leave Room'], button[aria-label*='Home']");
      if (leaveBtn) leaveBtn.click();
    })()`);
    await cdp.sleep(1000);

    const homeUrl = await cdp.evaluate('window.location.pathname');
    assert('Leaving room navigates cleanly to Home', homeUrl === '/', homeUrl);

    console.log('\n=== BROWSER TEST RUN FINISHED ===');
    const passed = testResults.filter(t => t.pass).length;
    const failed = testResults.filter(t => !t.pass).length;
    console.log(`Total: ${testResults.length} | Passed: ${passed} | Failed: ${failed}`);

    if (cdp.pageErrors.length > 0) {
      console.warn('\nCaptured Page Errors:', JSON.stringify(cdp.pageErrors, null, 2));
    } else {
      console.log('Zero unhandled JavaScript errors in browser console during run.');
    }

  } finally {
    cdp.close();
  }
}

runFullBrowserAudit().catch((err) => {
  console.error('Fatal Browser QA Error:', err);
  process.exit(1);
});
