// Local, disposable-database load rehearsal. No hosted URLs or live data accepted.
require('../server/test-support/testEnvironment');
const assert = require('node:assert/strict');
const { fork } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const fs = require('node:fs'); const path = require('node:path');
const { io } = require('../client/node_modules/socket.io-client');
const { prisma } = require('../server/db/helpers');
const users = Math.max(2, Math.min(1000, Number(process.env.AUDIT_USERS) || 100));
const groupSize = Math.min(50, Number(process.env.AUDIT_GROUP_SIZE) || 20);
const namespace = `load-${randomUUID()}`;
const workers = []; const clients = []; const rooms = []; const errors = [];
function event(socket, name, timeout = 45000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, receive); reject(new Error(`Timed out: ${name}`)); }, timeout);
    function receive(data) { clearTimeout(timer); resolve(data); }
    socket.once(name, receive);
  });
}
async function startWorker() {
  const child = fork(path.resolve(__dirname, '../server/test-support/clusterChild.js'), [], { execArgv: [],
    env: { ...process.env, TEST_RATE_LIMIT_NAMESPACE: namespace, TRUST_PROXY: 'loopback' }, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  workers.push(child); let logs = '';
  child.stdout.on('data', b => { logs = (logs + b).slice(-3000); });
  child.stderr.on('data', b => { errors.push(String(b)); });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Worker timeout: ${logs}`)), 10000);
    child.once('message', data => { clearTimeout(timer); resolve({ ...data, child }); });
    child.once('exit', code => { if (code) { clearTimeout(timer); reject(new Error(`Worker exit ${code}: ${logs}`)); } });
  });
}
async function join(server, room, participant, host = false) {
  const lookup = await fetch(`${server.url}/api/v1/rooms/${room.pin}`, { headers: { 'x-forwarded-for': participant.ip } });
  assert.equal(lookup.status, 200);
  await lookup.json();
  const socket = io(server.url, { transports: ['websocket'], reconnection: false, forceNew: true, timeout: 30000 });
  clients.push(socket); socket.on('room_error', e => errors.push(JSON.stringify(e))); socket.on('ballot_error', e => errors.push(JSON.stringify(e)));
  await event(socket, 'connect'); const joined = event(socket, 'lobby_state');
  socket.emit('join_lobby', { pin: room.pin, participant_id: participant.id, device_id: participant.device_id,
    user_name: host ? 'Load Host' : `Load ${clients.length}`, ...(host ? { host_token: room.host_token } : {}) });
  await joined; return socket;
}
function percentile(values, quantile) { return Math.round([...values].sort((a,b) => a-b)[Math.min(values.length-1, Math.floor(values.length * quantile))]); }
(async () => {
  const began = performance.now(); let report;
  try {
    const servers = await Promise.all([startWorker(), startWorker()]);
    for (let i = 0; i < Math.ceil(users / groupSize); i++) {
      const host = { id: randomUUID(), device_id: `v2_${randomUUID()}`, ip: `198.51.100.${i + 1}` };
      const server = servers[i % 2];
      const res = await fetch(`${server.url}/api/v1/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ host_id: host.id, device_id: host.device_id, mode: 'CUSTOM', theme: 'Local load rehearsal', radius: 5000 }) });
      assert.equal(res.status, 201); const room = { ...await res.json(), host, members: [] };
      rooms.push(room); room.members.push({ user: host, socket: await join(server, room, host, true) });
    }
    const jobs = [];
    for (let index = rooms.length; index < users; index++) {
      const room = rooms[(index - rooms.length) % rooms.length];
      const user = { id: randomUUID(), device_id: `v2_${randomUUID()}`, ip: `198.18.${Math.floor(index / 250)}.${index % 250 + 1}` };
      jobs.push(async () => room.members.push({ user, socket: await join(servers[index % 2], room, user) }));
    }
    // Connect in bounded bursts, retain every connection, then vote concurrently.
    for (let i = 0; i < jobs.length; i += 100) await Promise.all(jobs.slice(i, i+100).map(work => work()));
    const connectedAt = performance.now();
    console.log(`${clients.length} simultaneous clients connected across ${rooms.length} rooms and two processes`);
    for (const room of rooms) {
      room.options = [{ id: randomUUID(), name: 'Preferred' }, { id: randomUUID(), name: 'Other' }];
      const started = event(room.members[0].socket, 'voting_started');
      room.members[0].socket.emit('host_start_voting', { pin: room.pin, host_id: room.host.id, host_token: room.host_token, options: room.options });
      await started;
    }
    const latencies = []; const received = []; const finished = [];
    for (const room of rooms) for (const member of room.members) {
      const before = performance.now();
      finished.push(event(member.socket, 'winner_announced').then(outcome => {
        latencies.push(performance.now() - before);
        assert.equal(outcome.winningOptionId, room.options[0].id);
        assert.equal(outcome.total_voted, room.members.length);
        received.push(member.user.id);
      }));
    }
    const votingAt = performance.now();
    const rest = []; let number = 0;
    for (const room of rooms) for (const member of room.members) {
      const rankings = room.options.map((o, index) => ({ option_id: o.id, score: index ? -1 : 1 }));
      if (number++ % 2) rest.push(() => fetch(`${servers[number % 2].url}/api/v1/rooms/${room.pin}/votes`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': member.user.ip },
        body: JSON.stringify({ participant_id: member.user.id, device_id: member.user.device_id, rankings }),
      }).then(async r => { assert.equal(r.status, 200); await r.json(); }));
      else member.socket.emit('submit_ballot', { pin: room.pin, participant_id: member.user.id, rankings });
    }
    const httpConcurrency = Math.min(100, Number(process.env.AUDIT_HTTP_CONCURRENCY) || 50);
    const queue = [...rest];
    await Promise.all(Array.from({length: httpConcurrency}, async () => {
      while (queue.length) await queue.shift()();
    }));
    await Promise.all(finished);
    const votingMs = performance.now() - votingAt;
    const durableVotes = await prisma.vote.count({ where: { participant: { roomId: { in: rooms.map(r => r.room_id) } } } });
    assert.equal(durableVotes, users * 2); assert.equal(new Set(received).size, users); assert.deepEqual(errors, []);
    const metrics = await Promise.all(servers.map(async s => (await fetch(`${s.url}/__test/metrics`)).json()));
    report = { clients: users, rooms: rooms.length, serverProcesses: 2, roomLookups: users, restBallots: Math.floor(users/2), maxConcurrentRestRequests: httpConcurrency, socketBallots: Math.ceil(users/2), allClientsReceivedCorrectResult: true,
      durableVoteRows: durableVotes, errors, connectMs: Math.round(connectedAt-began), votingMs: Math.round(votingMs),
      ballotToResultMs: { p50: percentile(latencies,.5), p95: percentile(latencies,.95), p99: percentile(latencies,.99) }, metrics };
    console.log(JSON.stringify(report, null, 2));
  } catch (error) { report = { clients: users, failed: true, error: error.stack, errors }; console.error(error); process.exitCode = 1; }
  finally {
    clients.forEach(s => s.disconnect());
    await Promise.all(workers.map(child => new Promise(resolve => { if (child.exitCode !== null || child.signalCode) return resolve(); child.once('exit', resolve); child.kill('SIGKILL'); })));
    await prisma.room.deleteMany({ where: { id: { in: rooms.map(r => r.room_id) } } });
    await prisma.$disconnect();
    fs.writeFileSync(process.env.AUDIT_LOAD_OUTPUT || '/private/tmp/consensus-cluster-load.json', JSON.stringify(report,null,2)+'\n');
  }
})();
