const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { fork } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { io: clientIO } = require('../../client/node_modules/socket.io-client');
const { prisma } = require('../db/helpers');
const { consumeSharedBudget } = require('./state/sharedRateLimit');
const workers = new Set(); const sockets = []; const roomIds = [];
const namespace = `cluster-${randomUUID()}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
function event(socket, name, predicate = () => true, timeout = 6000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, receive); reject(new Error(`Missing ${name}`)); }, timeout);
    function receive(data) { if (!predicate(data)) return; clearTimeout(timer); socket.off(name, receive); resolve(data); }
    socket.on(name, receive);
  });
}
async function worker(extra = {}) {
  const process = fork(path.resolve(__dirname, '../test-support/clusterChild.js'), [], {
    env: { ...global.process.env, TEST_RATE_LIMIT_NAMESPACE: namespace, ROOM_SWEEP_MS: '500', ...extra },
    execArgv: [],
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  workers.add(process); let logs = '';
  process.stdout.on('data', b => { logs += b; }); process.stderr.on('data', b => { logs += b; });
  const ready = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { process.kill('SIGKILL'); reject(new Error(`Worker boot timed out: ${logs}`)); }, 10000);
    process.once('message', message => { clearTimeout(timer); resolve(message); });
    process.once('exit', code => { clearTimeout(timer); reject(new Error(`Worker exited ${code}: ${logs}`)); });
  });
  return { process, url: ready.url, logs: () => logs };
}
async function stop(w, signal = 'SIGKILL') {
  if (w.process.exitCode !== null || w.process.signalCode) return;
  await new Promise(resolve => { w.process.once('exit', resolve); w.process.kill(signal); });
  workers.delete(w.process);
}
async function connect(url) {
  const socket = clientIO(url, { transports: ['websocket'], reconnection: false, forceNew: true }); sockets.push(socket);
  await event(socket, 'connect'); return socket;
}
async function post(url, route, body) {
  const response = await fetch(`${url}/api/v1${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
async function room(url) {
  const host = { id: randomUUID(), device_id: `v2_${randomUUID()}` };
  const response = await post(url, '/rooms', { host_id: host.id, device_id: host.device_id, mode: 'CUSTOM', theme: 'Durable custom poll', radius: 5000 });
  assert.equal(response.status, 201); roomIds.push(response.body.room_id);
  return { ...response.body, host };
}
async function join(url, room, user = room.host, extra = {}) {
  const socket = await connect(url); const state = event(socket, 'lobby_state');
  socket.emit('join_lobby', { pin: room.pin, participant_id: user.id, device_id: user.device_id, user_name: user.id === room.host.id ? 'Host' : 'Guest', ...(user.id === room.host.id ? { host_token: room.host_token } : {}), ...extra });
  return { socket, state: await state };
}
async function start(room, hostSocket, options) {
  const started = event(hostSocket, 'voting_started');
  hostSocket.emit('host_start_voting', { pin: room.pin, host_id: room.host.id, host_token: room.host_token, options });
  return started;
}
after(async () => {
  sockets.forEach(s => s.disconnect());
  await Promise.all([...workers].map(p => new Promise(resolve => { if (p.exitCode !== null || p.signalCode) return resolve(); p.once('exit', resolve); p.kill('SIGKILL'); })));
  await prisma.room.deleteMany({ where: { id: { in: roomIds } } });
  await prisma.$disconnect();
});

test('SIGKILL before voting preserves custom suggestions, authors, settings, bans and discovery removals', async () => {
  const a = await worker(); const r = await room(a.url);
  let host = await join(a.url, r, r.host, { initial_suggestions: ['Catan', 'Chess'], group_size: 6 });
  const guest = { id: randomUUID(), device_id: `v2_${randomUUID()}` }; const peer = await join(a.url, r, guest);
  let changed = event(host.socket, 'suggestions_updated'); peer.socket.emit('add_suggestion', { pin: r.pin, participant_id: guest.id, suggestion: 'Bowling' }); await changed;
  changed = event(host.socket, 'table_places_updated'); host.socket.emit('remove_discovery_place', { pin: r.pin, option_id: 'excluded-place' }); await changed;
  changed = event(host.socket, 'lobby_roster_update'); host.socket.emit('remove_participant', { pin: r.pin, participant_id: guest.id }); await changed;
  await stop(a);
  const b = await worker(); host = await join(b.url, r);
  assert.deepEqual(host.state.suggestions, ['Catan', 'Chess', 'Bowling']);
  assert.equal(host.state.group_size, 6); assert.ok(host.state.removed_place_ids.includes('excluded-place'));
  const rejected = await connect(b.url); const error = event(rejected, 'room_error');
  rejected.emit('join_lobby', { pin: r.pin, participant_id: guest.id, device_id: guest.device_id });
  assert.match((await error).message, /removed/i);
  await stop(b);
});

test('unfinished voting resumes the exact snapshot, eligibility, saved ballots and metadata after SIGKILL', async () => {
  const a = await worker(); const r = await room(a.url); const guest = { id: randomUUID(), device_id: `v2_${randomUUID()}` };
  const host = await join(a.url, r); await join(a.url, r, guest);
  const options = [{ id: randomUUID(), name: 'A', address: 'Exact address', lat: 47.01, lng: 28.82, price_level: 2, photo_url: 'https://example.com/a.jpg' }, { id: randomUUID(), name: 'B', price_level: 1 }];
  await start(r, host.socket, options);
  const progress = event(host.socket, 'vote_progress');
  host.socket.emit('submit_ballot', { pin: r.pin, participant_id: r.host.id, rankings: [{ option_id: options[0].id, score: 2 }, { option_id: options[1].id, score: -1 }] });
  assert.equal((await progress).voted_participants, 1);
  const before = (await prisma.room.findUnique({ where: { pin: r.pin } })).runtimeState.voting;
  await stop(a);
  const b = await worker(); const restored = await connect(b.url); const restore = event(restored, 'state_restore');
  restored.emit('join_room', { pin: r.pin, participant_id: r.host.id, device_id: r.host.device_id });
  const state = await restore; assert.deepEqual(state.options, before.options); assert.equal(state.already_voted, true); assert.equal(state.total_participants, 2);
  const peer = await join(b.url, r, guest); const winner = event(restored, 'winner_announced');
  peer.socket.emit('submit_ballot', { pin: r.pin, participant_id: guest.id, rankings: [{ option_id: options[0].id, score: 1 }, { option_id: options[1].id, score: -1 }] });
  const outcome = await winner; assert.equal(outcome.winningOptionId, options[0].id); assert.equal(outcome.support.liked, 2);
  await stop(b);
});

test('two real servers share rosters, cross-node updates, immutable ballots, resolution and rematches', async () => {
  const [a, b] = await Promise.all([worker(), worker()]); const r = await room(a.url);
  const host = await join(a.url, r); const guest = { id: randomUUID(), device_id: `v2_${randomUUID()}` };
  const crossRoster = event(host.socket, 'participant_joined', p => p.participants.length === 2);
  const peer = await join(b.url, r, guest); assert.equal((await crossRoster).participants.length, 2);
  const suggestion = event(host.socket, 'suggestions_updated'); peer.socket.emit('add_suggestion', { pin: r.pin, participant_id: guest.id, suggestion: 'Shared idea' });
  assert.ok((await suggestion).suggestions.includes('Shared idea'));
  const options = [{ id: randomUUID(), name: 'First' }, { id: randomUUID(), name: 'Second' }];
  const remoteStart = event(peer.socket, 'voting_started'); await start(r, host.socket, options); await remoteStart;
  const winners = [event(host.socket, 'winner_announced'), event(peer.socket, 'winner_announced')];
  const votes = options.map((o, i) => ({ option_id: o.id, score: i ? -1 : 1 }));
  host.socket.emit('submit_ballot', { pin: r.pin, participant_id: r.host.id, rankings: votes });
  // Race a conflicting REST retry through the other node with the original socket ballot.
  const retry = post(b.url, `/rooms/${r.pin}/votes`, { participant_id: r.host.id, device_id: r.host.device_id, rankings: options.map(o => ({ option_id: o.id, score: -1 })) });
  peer.socket.emit('submit_ballot', { pin: r.pin, participant_id: guest.id, rankings: votes });
  const [one, two] = await Promise.all(winners); assert.deepEqual(one, two); await retry;
  const state = (await prisma.room.findUnique({ where: { pin: r.pin } })).runtimeState.voting;
  for (const [id, ballot] of state.submissions) {
    const durable = await prisma.vote.findMany({ where: { participantId: id } });
    for (const v of durable) assert.equal(v.score, ballot.votes.find(x => x.option_id === v.optionId).score);
  }
  const rematches = [event(host.socket, 'winner_announced'), event(peer.socket, 'winner_announced')];
  host.socket.emit('quick_rematch', { pin: r.pin, host_id: r.host.id });
  const [next, remote] = await Promise.all(rematches); assert.deepEqual(next, remote); assert.notEqual(next.winningOptionId, one.winningOptionId);
  await Promise.all([stop(a), stop(b)]);
  const c = await worker(); const reconnect = await connect(c.url); const recovered = event(reconnect, 'winner_announced');
  reconnect.emit('join_room', { pin: r.pin, participant_id: guest.id, device_id: guest.device_id });
  const result = await recovered; assert.equal(result.winningOptionId, next.winningOptionId); assert.equal(result.status, 'RUNNER_UP');
  await stop(c);
});

test('database rollback publishes no successful mutation and no phantom suggestion survives reconnect', async () => {
  const a = await worker(); const r = await room(a.url); const host = await join(a.url, r);
  // A temporary trigger injects an actual database failure for this one test room.
  await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION audit_reject_room_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.pin = '${r.pin}' AND NEW."runtimeState"::text LIKE '%rollback-marker%' THEN RAISE EXCEPTION 'injected audit failure'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER audit_reject_snapshot BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION audit_reject_room_update()');
  let successes = 0; host.socket.on('suggestions_updated', () => successes++);
  try {
    const rejected = event(host.socket, 'room_error'); host.socket.emit('add_suggestion', { pin: r.pin, participant_id: r.host.id, suggestion: 'rollback-marker' });
    assert.equal((await rejected).code, 'STATE_UNAVAILABLE'); assert.equal(successes, 0);
    const state = event(host.socket, 'lobby_state'); host.socket.emit('join_lobby', { pin: r.pin, participant_id: r.host.id, device_id: r.host.device_id });
    assert.ok(!(await state).suggestions.includes('rollback-marker'));
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER audit_reject_snapshot ON rooms');
    await prisma.$executeRawUnsafe('DROP FUNCTION audit_reject_room_update()');
    await stop(a);
  }
});

test('shared rate budgets survive application restarts and cannot be multiplied across nodes', async () => {
  const scope = `test-budget-${randomUUID()}`;
  const values = await Promise.all(Array.from({ length: 12 }, () => consumeSharedBudget(scope, 'same-ip', 60000, 4)));
  assert.equal(values.filter(v => v.allowed).length, 4);
  // Querying from an entirely different process uses the same durable budget.
  const code = `require('./test-support/testEnvironment');require('./src/state/sharedRateLimit').consumeSharedBudget(${JSON.stringify(scope)},'same-ip',60000,4).then(async r=>{process.send(r);await require('./db/prismaClient').prisma.$disconnect()})`;
  const child = fork('-e', [code], { execArgv: [], cwd: path.resolve(__dirname, '..'), env: { ...process.env, TEST_RATE_LIMIT_NAMESPACE: process.env.RATE_LIMIT_NAMESPACE }, stdio: ['ignore','ignore','ignore','ipc'] });
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Rate budget child timed out')); }, 5000);
    child.once('message', message => { clearTimeout(timeout); resolve(message); });
    child.once('exit', code => { if (code) { clearTimeout(timeout); reject(new Error(`Rate child exited ${code}`)); } });
  }); assert.equal(result.allowed, false);
});

test('a surviving server expires a dead host lease and persists host migration without changing quorum', async () => {
  const [a, b] = await Promise.all([worker(), worker({ ROOM_SWEEP_MS: '100' })]); const r = await room(a.url);
  const host = await join(a.url, r); const guest = { id: randomUUID(), device_id: `v2_${randomUUID()}` };
  const peer = await join(b.url, r, guest);
  await start(r, host.socket, [{ id: randomUUID(), name: 'A' }, { id: randomUUID(), name: 'B' }]);
  await stop(a);
  // Age only the failed host's durable lease; keep the survivor's lease current.
  const record = await prisma.room.findUnique({ where: { pin: r.pin } });
  record.runtimeState.lobby.participants.find(p => p.id === r.host.id).lastSeenAt = Date.now() - 120000;
  const migrated = event(peer.socket, 'host_migrated');
  await prisma.room.update({ where: { id: record.id }, data: { runtimeState: record.runtimeState } });
  assert.equal((await migrated).new_host_id, guest.id);
  const saved = await prisma.room.findUnique({ where: { id: record.id } });
  assert.equal(saved.hostId, guest.id); assert.equal(saved.runtimeState.voting.expectedCount, 2);
  await stop(b);
});

test('persisted expiry is honored on a new server instead of reopening an expired room', async () => {
  const a = await worker(); const r = await room(a.url); await join(a.url, r); await stop(a);
  const record = await prisma.room.findUnique({ where: { id: r.room_id } });
  record.runtimeState.lobby.lastActivityAt = Date.now() - 3 * 60 * 60 * 1000;
  await prisma.room.update({ where: { id: record.id }, data: { runtimeState: record.runtimeState } });
  const b = await worker({ ROOM_SWEEP_MS: '100' });
  const deadline = Date.now() + 4000;
  while (!(await prisma.room.findUnique({ where: { id: record.id } })).runtimeState.closed) {
    if (Date.now() > deadline) throw new Error('Persisted room was not expired');
    await wait(50);
  }
  const socket = await connect(b.url); const error = event(socket, 'room_error');
  socket.emit('join_lobby', { pin: r.pin, participant_id: r.host.id, device_id: r.host.device_id });
  assert.match((await error).message, /expired/i); await stop(b);
});

test('a worker killed while waiting for a room lock leaves no accepted ballot or phantom progress', async () => {
  const a = await worker(); const r = await room(a.url); const host = await join(a.url, r);
  const options = [{ id: randomUUID(), name: 'A' }, { id: randomUUID(), name: 'B' }]; await start(r, host.socket, options);
  let release; let locked;
  const lockReady = new Promise(resolve => { locked = resolve; });
  const blocker = prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM rooms WHERE pin = ${r.pin} FOR UPDATE`;
    locked(); await new Promise(resolve => { release = resolve; });
  }, { timeout: 10000 });
  await lockReady;
  host.socket.emit('submit_ballot', { pin: r.pin, participant_id: r.host.id, rankings: options.map(o => ({ option_id: o.id, score: 1 })) });
  await wait(40); await stop(a); release(); await blocker;
  const b = await worker(); const socket = await connect(b.url); const restored = event(socket, 'state_restore');
  socket.emit('join_room', { pin: r.pin, participant_id: r.host.id, device_id: r.host.device_id });
  assert.equal((await restored).already_voted, false);
  assert.equal(await prisma.vote.count({ where: { participantId: r.host.id } }), 0);
  await stop(b);
});

test('reconnecting on another live node cancels stale disconnect failover through the durable lease', async () => {
  const [a,b] = await Promise.all([worker({ DISCONNECT_GRACE_MS:'200' }),worker()]); const r = await room(a.url);
  const host = await join(a.url,r); const guest = {id:randomUUID(),device_id:`v2_${randomUUID()}`}; const peer=await join(b.url,r,guest);
  const away=event(peer.socket,'participant_status_changed');host.socket.disconnect();await away;
  await join(b.url,r);await wait(350);
  const record=await prisma.room.findUnique({where:{pin:r.pin}});
  assert.equal(record.hostId,r.host.id);assert.equal(record.runtimeState.lobby.participants.find(p=>p.id===r.host.id).isOnline,true);
  await Promise.all([stop(a),stop(b)]);
});

test('joining the active deck renews presence instead of allowing a live voter’s lease to expire', async () => {
  const a=await worker();const r=await room(a.url);const host=await join(a.url,r);
  await start(r,host.socket,[{id:randomUUID(),name:'A'},{id:randomUUID(),name:'B'}]);
  const before=(await prisma.room.findUnique({where:{pin:r.pin}})).runtimeState.lobby.participants[0].lastSeenAt;
  await wait(30);const restored=event(host.socket,'state_restore');
  host.socket.emit('join_room',{pin:r.pin,participant_id:r.host.id,device_id:r.host.device_id});await restored;
  const after=(await prisma.room.findUnique({where:{pin:r.pin}})).runtimeState.lobby.participants[0].lastSeenAt;
  assert.ok(after>before);await stop(a);
});
