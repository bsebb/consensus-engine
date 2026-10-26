require('../server/test-support/testEnvironment');
const { fork, execFileSync } = require('node:child_process');
const net = require('node:net'); const path = require('node:path'); const fs = require('node:fs');
const { randomUUID } = require('node:crypto'); const assert = require('node:assert/strict');
const browserEngine = require(process.env.PLAYWRIGHT_MODULE || 'playwright')[process.env.AUDIT_BROWSER || 'chromium'];
const { prisma } = require('../server/db/helpers');
const children = new Set(); const checks = []; const pageErrors = []; let browser; let pin; let page;
const output = process.env.AUDIT_RESTART_OUTPUT || '/private/tmp/consensus-restart-browser'; fs.mkdirSync(output,{ recursive:true });
const namespace = `restart-browser-${randomUUID()}`;
async function freePort() { const s = net.createServer(); await new Promise(r => s.listen(0,'127.0.0.1',r)); const port=s.address().port; await new Promise(r => s.close(r)); return port; }
function childReady(child) {
  children.add(child); let logs=''; child.stdout?.on('data', b=>{logs=(logs+b).slice(-3000)}); child.stderr?.on('data', b=>{logs=(logs+b).slice(-3000)});
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Child startup timeout ${logs}`)),10000);
    child.once('message',data=>{clearTimeout(timer);resolve({child,...data})}); child.once('exit',code=>{if(code){clearTimeout(timer);reject(new Error(`Child exited ${code}: ${logs}`))}});
  });
}
async function startStatic(port,backend) {
 return childReady(fork(path.resolve(__dirname,'../server/test-support/productionFrontend.js'),[],{execArgv:[],env:{...process.env,TEST_BACKEND_URL:backend,TEST_FRONTEND_PORT:String(port)},stdio:['ignore','pipe','pipe','ipc']}));
}
async function stop(child) { if(child.exitCode!==null||child.signalCode)return; await new Promise(r=>{child.once('exit',r);child.kill('SIGKILL')});children.delete(child); }
async function voteAll(p) { await p.getByRole('button',{name:'Like',exact:true}).waitFor(); for(let i=0;i<13;i++){const like=p.getByRole('button',{name:'Like',exact:true});if(!await like.count())break;await like.click();await p.waitForTimeout(230)}assert.equal(await p.getByRole('button',{name:'Like',exact:true}).count(),0); }
function passed(name){ checks.push(name);console.log(`PASS ${name}`); }
(async()=>{
 try {
  const port=await freePort();
  const startBackend=()=>childReady(fork(path.resolve(__dirname,'../server/test-support/clusterChild.js'),[],{execArgv:[],env:{...process.env,TEST_RATE_LIMIT_NAMESPACE:namespace,TEST_LISTEN_PORT:String(port)},stdio:['ignore','pipe','pipe','ipc']}));
  let backend=await startBackend();
  const code="import('vite').then(async ({createServer})=>{const s=await createServer({server:{host:'127.0.0.1',port:0,strictPort:true}});await s.listen();process.send({url:'http://127.0.0.1:'+s.httpServer.address().port})})";
  let frontend;
  if (process.env.AUDIT_PRODUCTION === 'true') {
    execFileSync('npm',['run','build'],{cwd:path.resolve(__dirname,'../client'),env:{...process.env,VITE_SERVER_URL:'',VITE_API_URL:'',VITE_SOCKET_URL:''},stdio:'pipe'});
    frontend=await startStatic(0,`http://127.0.0.1:${port}`);
  } else frontend=await childReady(fork('-e',[code],{execArgv:[],cwd:path.resolve(__dirname,'../client'),env:{...process.env,VITE_SERVER_URL:`http://127.0.0.1:${port}`},stdio:['ignore','pipe','pipe','ipc']}));

  browser=await browserEngine.launch({headless:true,...(process.env.AUDIT_BROWSER !== 'webkit' && process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  const context1=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const context2=await browser.newContext({viewport:{width:1280,height:900}});
  const host=await context1.newPage(),guest=await context2.newPage(); page=host;
  for(const p of [host,guest]){p.setDefaultTimeout(12000);p.on('pageerror',e=>pageErrors.push(e.message));}
  if (process.env.AUDIT_PRODUCTION === 'true') {
    const response=await host.goto(frontend.url);
    assert.match(response.headers()['content-security-policy'],/script-src 'self';/);
    assert.equal(response.headers()['x-frame-options'],'DENY');
    await host.evaluate(()=>navigator.serviceWorker.ready);
    await host.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
    await host.getByRole('button',{name:'Create Room',exact:true}).waitFor();
    const assetCount=await host.evaluate(async()=>{
      const names=await caches.keys();let count=0;
      for(const name of names) count+=(await (await caches.open(name)).keys()).filter(r=>new URL(r.url).pathname.startsWith('/assets/')).length;
      return count;
    });assert.ok(assetCount>0);
    // Stop the origin itself: WebKit's setOffline emulation rejects even local SW responses.
    const frontendPort=Number(new URL(frontend.url).port);await stop(frontend.child);
    await host.goto(`${frontend.url}/offline-probe`);
    await host.getByRole('button',{name:'Create Room',exact:true}).waitFor();
    frontend=await startStatic(frontendPort,`http://127.0.0.1:${port}`);
    passed('production headers, complete first-visit precache and app shell during an actual origin outage');
  }
  await host.goto(frontend.url);await host.getByPlaceholder('e.g. Alex (optional)').fill('Restart Host');
  await host.getByRole('button',{name:'Custom Poll Your own ideas'}).click();await host.getByRole('button',{name:/Board Games/}).click();
  await host.getByRole('button',{name:/Create Room \(4\)/}).click();await host.waitForURL(/\/lobby\/\d{4}/);pin=new URL(host.url()).pathname.split('/').pop();
  await guest.goto(`${frontend.url}/j/${pin}`);await guest.getByPlaceholder('e.g. Alex (optional)').fill('Restart Guest');await guest.getByRole('button',{name:'Join Room',exact:true}).click();await guest.waitForURL(/\/lobby\//);
  await guest.getByLabel('New candidate suggestion').fill('Durable suggestion');await guest.getByRole('button',{name:'Add',exact:true}).click();
  await host.getByText('Durable suggestion',{exact:true}).first().waitFor();
  await stop(backend.child);backend=await startBackend();
  await Promise.all([host.reload(),guest.reload()]);
  await host.getByText('Durable suggestion',{exact:true}).first().waitFor();await host.getByText(/Restart Guest/).first().waitFor();
  await host.getByRole('button',{name:/Start Voting/}).waitFor();passed('lobby, guest suggestion, roster and host controls survive a backend SIGKILL');
  await host.getByRole('button',{name:/Start Voting/}).click();await Promise.all([host.waitForURL(/\/deck\//),guest.waitForURL(/\/deck\//)]);
  await host.getByRole('button',{name:'Like',exact:true}).click();await host.waitForTimeout(300);
  const saved=await host.evaluate(pin=>JSON.parse(localStorage.getItem(`ballot:${pin}`)||'[]'),pin);assert.equal(saved.length,1);
  await voteAll(guest);await guest.getByText(/Waiting for your friends/).waitFor();
  const before=(await prisma.room.findUnique({where:{pin}})).runtimeState.voting;assert.equal(before.submissions.length,1);
  await stop(backend.child);backend=await startBackend();
  // Direct URL navigation deliberately removes router-provided card state.
  await Promise.all([host.goto(`${frontend.url}/deck/${pin}`),guest.goto(`${frontend.url}/deck/${pin}`)]);
  await guest.getByText(/Waiting for your friends/).waitFor();await host.getByRole('button',{name:'Like',exact:true}).waitFor();
  await host.waitForFunction(()=>document.body.innerText.includes('2')&&document.body.innerText.includes('/ 5'));
  assert.equal(await host.evaluate(pin=>JSON.parse(localStorage.getItem(`ballot:${pin}`)||'[]').length,pin),1);
  const after=(await prisma.room.findUnique({where:{pin}})).runtimeState.voting;assert.deepEqual(after.options,before.options);assert.deepEqual(after.submissions,before.submissions);
  passed('unfinished five-card deck, local partial swipe and the guest’s submitted ballot recover after a second SIGKILL');
  await voteAll(host);await Promise.all([host.getByRole('button',{name:'Start Another Pick',exact:true}).waitFor(),guest.getByRole('button',{name:'Start Another Pick',exact:true}).waitFor()]);
  assert.equal(await host.locator('h2').first().innerText(),await guest.locator('h2').first().innerText());
  await host.getByText('2 of 2 liked · 0 vetoes',{exact:true}).first().waitFor();
  await host.waitForTimeout(400);await host.screenshot({path:path.join(output,'winner-after-two-restarts.png'),fullPage:true});
  passed('remaining swipes resolve one shared result after recovery');assert.deepEqual(pageErrors,[]);passed('zero unhandled browser exceptions');
  if (process.env.AUDIT_FULL_BROWSER === 'true') {
    const child=fork(path.resolve(__dirname,'security-browser-test.cjs'),[],{execArgv:[],env:{...process.env,AUDIT_APP_URL:frontend.url,AUDIT_REAL_FAILURE:process.env.AUDIT_PRODUCTION==='true'?'true':''},stdio:['ignore','pipe','pipe','ipc']});
    children.add(child);child.stdout.on('data', b=>process.stdout.write(b));child.stderr.on('data',b=>process.stderr.write(b));
    const code=await new Promise(resolve=>child.once('exit',resolve));children.delete(child);assert.equal(code,0);passed('full browser user-flow suite passes on the recovered backend');
  }

 } catch(e){console.error(e.stack);if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});process.exitCode=1;checks.push(`FAIL ${e.message}`);}
 finally {await browser?.close();await Promise.all([...children].map(stop));if(pin)await prisma.room.deleteMany({where:{pin}});await prisma.$disconnect();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,pageErrors},null,2)+'\n');}
})();
