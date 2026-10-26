const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { io: clientIO } = require('../../client/node_modules/socket.io-client');
const { app, httpServer, io, ready } = require('../app');
const { prisma, createRoom } = require('../db/helpers');
const { activeLobbies, activeVotingSessions, disconnectTimeouts } = require('./sockets/socketSessionStore');
const { createRateLimiter } = require('./utils/rateLimiter');
const { sanitizeBallot } = require('./utils/ballot');
let base;
const sockets = [];
const roomIds = [];
const pause = ms => new Promise(r => setTimeout(r, ms));
const uuid = () => crypto.randomUUID();
function wait(socket, event) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off(event, receive); reject(new Error(`Missing ${event}`)); }, 2500);
    function receive(data) { clearTimeout(timeout); resolve(data); }
    socket.once(event, receive);
  });
}
async function request(path, body, method = 'POST', headers = {}) {
  const response = await fetch(`${base}/api/v1${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
async function connect() {
  const s = clientIO(base, { transports: ['websocket'], reconnection: false, forceNew: true });
  sockets.push(s);
  await wait(s, 'connect');
  return s;
}
async function fixture(mode = 'CUSTOM') {
  const host = { id: uuid(), device: `v2_${uuid()}` };
  const guest = { id: uuid(), device: `v2_${uuid()}` };
  const res = await request('/rooms', { host_id: host.id, device_id: host.device, mode, theme: mode === 'CUSTOM' ? 'Security test' : 'restaurants', radius: 5000 });
  assert.equal(res.status, 201);
  roomIds.push(res.body.room_id);
  const room = res.body;
  host.socket = await connect(); guest.socket = await connect();
  for (const user of [host, guest]) {
    const ready = wait(user.socket, 'lobby_state');
    user.socket.emit('join_lobby', { pin: room.pin, participant_id: user.id, device_id: user.device, user_name: user === host ? 'Host' : 'Guest', ...(user === host ? { host_token: room.host_token } : {}) });
    user.state = await ready;
  }
  const options = [{ id: uuid(), name: 'One', price_level: 1 }, { id: uuid(), name: 'Two', price_level: 2 }, { id: uuid(), name: 'Three', price_level: 3 }];
  return { host, guest, room, options };
}
async function start(f) {
  const started = wait(f.host.socket, 'voting_started');
  f.host.socket.emit('host_start_voting', { pin: f.room.pin, host_id: f.host.id, host_token: f.room.host_token, options: f.options });
  return await started;
}
before(async () => { await ready; await new Promise(r => httpServer.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${httpServer.address().port}`; });
after(async () => {
  sockets.forEach(s => s.disconnect());
  for (const timer of disconnectTimeouts.values()) clearTimeout(timer);
  disconnectTimeouts.clear();
  await prisma.room.deleteMany({ where: { id: { in: roomIds } } });
  await new Promise(r => io.close(r));
  await prisma.$disconnect();
});

test('public room, roster and budget broadcasts contain no device credentials or private budget amounts', async () => {
  const f = await fixture();
  const publicRoom = await request(`/rooms/${f.room.pin}`, undefined, 'GET');
  assert.equal(publicRoom.headers.get('cache-control'), 'no-store');
  for (const payload of [publicRoom.body, f.guest.state]) {
    assert.ok(!JSON.stringify(payload).includes(f.host.device));
    assert.ok(!JSON.stringify(payload).includes('budgetCap'));
  }
  const budget = wait(f.guest.socket, 'budget_updated');
  f.host.socket.emit('update_budget', { pin: f.room.pin, participant_id: f.host.id, budgetSealed: true, budgetLimit: 321 });
  const data = await budget;
  assert.ok(!JSON.stringify(data).includes(f.host.device));
  assert.ok(!JSON.stringify(data).includes('321'));
});

test('forged host joins, unjoined actions and cross-room host privileges are denied', async () => {
  const f = await fixture(); const other = await fixture();
  const outsider = await connect();
  let denied = wait(outsider, 'room_error');
  outsider.emit('join_lobby', { pin: f.room.pin, participant_id: f.host.id, device_id: `v2_${uuid()}` });
  await denied;
  denied = wait(outsider, 'room_error');
  outsider.emit('add_suggestion', { pin: f.room.pin, participant_id: f.guest.id, suggestion: 'Spoof' });
  await denied;
  assert.equal(activeLobbies.get(f.room.pin).suggestions.length, 0);
  denied = wait(other.host.socket, 'room_error');
  other.host.socket.emit('host_start_voting', { pin: f.room.pin, host_id: f.host.id, options: f.options });
  await denied;
  assert.equal(activeVotingSessions.has(f.room.pin), false);
  denied = wait(f.guest.socket, 'room_error');
  f.guest.socket.emit('host_start_voting', { pin: f.room.pin, host_id: f.host.id, options: f.options });
  await denied;
});

test('one member cannot change another member’s budget, remove them, or cast their ballot', async () => {
  const f = await fixture();
  f.guest.socket.emit('update_budget', { pin: f.room.pin, participant_id: f.host.id, budgetSealed: true, budgetLimit: 1 });
  f.guest.socket.emit('leave_room', { pin: f.room.pin, participant_id: f.host.id });
  await pause(30);
  assert.equal(activeLobbies.get(f.room.pin).has(f.host.id), true);
  assert.equal(activeLobbies.get(f.room.pin).get(f.host.id).budgetSealed, false);
  await start(f);
  const error = wait(f.guest.socket, 'ballot_error');
  f.guest.socket.emit('submit_ballot', { pin: f.room.pin, participant_id: f.host.id, rankings: [{ option_id: f.options[0].id, score: 1 }] });
  assert.equal((await error).code, 'FORBIDDEN');
  assert.equal(activeVotingSessions.get(f.room.pin).submissions.size, 0);
});

test('REST mutations require the matching private device credential or host authorization', async () => {
  const f = await fixture(); await start(f);
  for (const [route, payload] of [
    ['votes', { rankings: [{ option_id: f.options[0].id, score: 1 }] }],
    ['constraints', { max_price_level: 1 }],
    ['feedback', { option_id: f.options[0].id, satisfaction_score: 5, price_accuracy_score: 5 }],
  ]) {
    const res = await request(`/rooms/${f.room.pin}/${route}`, { participant_id: f.host.id, device_id: f.guest.device, ...payload });
    assert.equal(res.status, 403, route);
  }
  assert.equal((await request(`/rooms/${f.room.pin}/finalize`, { host_id: f.host.id })).status, 403);
  assert.equal((await request(`/rooms/${f.room.room_id}/config`, { pin: f.room.pin, host_id: f.host.id, theme: 'Hijack', host_token: 'bad' }, 'PATCH')).status, 403);
  assert.equal((await request(`/rooms/${f.room.pin}/feedback`, { participant_id: f.guest.id, device_id: f.guest.device, option_id: f.options[0].id, satisfaction_score: 2.5, price_accuracy_score: 5 })).status, 400);
});

test('REST fallback and socket ballot share one immutable vote and resolve identically for both users', async () => {
  const f = await fixture(); await start(f);
  const ranking = f.options.map((o, i) => ({ option_id: o.id, score: i ? -1 : 1 }));
  const voted = wait(f.host.socket, 'vote_progress');
  f.host.socket.emit('submit_ballot', { pin: f.room.pin, participant_id: f.host.id, rankings: ranking });
  await voted;
  assert.equal((await request(`/rooms/${f.room.pin}`, undefined, 'GET')).body.status, 'VOTING');
  const hostWinner = wait(f.host.socket, 'winner_announced');
  const guestWinner = wait(f.guest.socket, 'winner_announced');
  const fallback = await request(`/rooms/${f.room.pin}/votes`, { participant_id: f.guest.id, device_id: f.guest.device, rankings: ranking });
  assert.equal(fallback.status, 200);
  const [a, b] = await Promise.all([hostWinner, guestWinner]);
  assert.equal(a.winningOptionId, f.options[0].id); assert.deepEqual(a, b); assert.equal(a.support.liked, 2); assert.equal(a.matchScore, 100);
  assert.equal((await request(`/rooms/${f.room.pin}`, undefined, 'GET')).body.status, 'RESOLVED');
  const after = activeVotingSessions.get(f.room.pin).submissions.get(f.host.id);
  f.host.socket.emit('submit_ballot', { pin: f.room.pin, participant_id: f.host.id, rankings: f.options.map(o => ({ option_id: o.id, score: -1 })) });
  await pause(30);
  assert.deepEqual(activeVotingSessions.get(f.room.pin).submissions.get(f.host.id), after);
  // Fresh socket / browser reload restores all outcome flags, not just the venue name.
  const reloaded = await connect(); const restored = wait(reloaded, 'winner_announced');
  reloaded.emit('join_room', { pin: f.room.pin, participant_id: f.guest.id, device_id: f.guest.device });
  const restoredResult = await restored;
  for (const field of ['support', 'status', 'tieBroken', 'supportText', 'vetoCount', 'allVetoed', 'matchScore']) assert.deepEqual(restoredResult[field], a[field], field);
  const feedback = await request(`/rooms/${f.room.pin}/feedback`, { participant_id: f.guest.id, device_id: f.guest.device, option_id: f.options[0].id, satisfaction_score: 5, price_accuracy_score: 4 });
  assert.equal(feedback.status, 200);
  assert.ok(await prisma.feedback.findUnique({ where: { id: feedback.body.feedback_id } }));
});

test('duplicate starts cannot reset ballots; late joins do not enlarge the voting quorum', async () => {
  const f = await fixture(); await start(f);
  const snapshot = activeVotingSessions.get(f.room.pin);
  const error = wait(f.host.socket, 'room_error');
  f.host.socket.emit('host_start_voting', { pin: f.room.pin, host_id: f.host.id, options: f.options });
  await error;
  assert.deepEqual(activeVotingSessions.get(f.room.pin), snapshot);
  const late = await connect(); const joined = wait(late, 'room_error');
  late.emit('join_lobby', { pin: f.room.pin, participant_id: uuid(), device_id: `v2_${uuid()}` });
  await joined;
  assert.equal(snapshot.expectedCount, 2);
});

test('PIN collisions preserve the original persisted room and participant', async () => {
  const f = await fixture();
  await assert.rejects(createRoom(uuid(), f.room.pin, 'collision', 5000, uuid(), uuid()), e => e.code === 'P2002');
  const original = await prisma.room.findUnique({ where: { pin: f.room.pin } });
  assert.equal(original.id, f.room.room_id);
  assert.equal(original.hostId, f.host.id);
});

test('rate limits cannot be bypassed by rotating device IDs', () => {
  const limiter = createRateLimiter({ max: 2 }); let accepted = 0; let status;
  const res = { setHeader() {}, status(code) { status = code; return this; }, json() {} };
  for (let i = 0; i < 5; i++) limiter({ ip: '203.0.113.8', headers: { 'x-device-id': uuid() }, body: { device_id: uuid() } }, res, () => accepted++);
  assert.equal(accepted, 2); assert.equal(status, 429);
});

test('malformed and oversized JSON are client errors; unapproved WebSocket origins are rejected', async () => {
  for (const [body, status] of [['{', 400], [JSON.stringify({ x: 'x'.repeat(17000) }), 413]]) {
    const response = await fetch(`${base}/api/v1/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    assert.equal(response.status, status);
  }
  const denied = clientIO(base, { transports: ['websocket'], reconnection: false, extraHeaders: { Origin: 'https://attacker.invalid' } });
  try { await wait(denied, 'connect_error'); assert.equal(denied.connected, false); } finally { denied.close(); }
});

test('ballot quotas and option IDs apply consistently', () => {
  assert.throws(() => sanitizeBallot([{ option_id: 'a', score: 2 }, { option_id: 'b', score: 2 }], ['a', 'b']), { code: 'SUPERLIKE_QUOTA_EXCEEDED' });
  assert.throws(() => sanitizeBallot([{ option_id: 'a', score: -100 }, { option_id: 'b', score: -100 }], ['a', 'b']), { code: 'VETO_QUOTA_EXCEEDED' });
});

test('simultaneous starts create one snapshot and mixed REST/socket retries persist one matching ballot', async () => {
  const f = await fixture();
  const ready = wait(f.host.socket, 'voting_started');
  for (let i = 0; i < 2; i++) f.host.socket.emit('host_start_voting', { pin: f.room.pin, host_id: f.host.id, options: f.options });
  await ready;
  const first = f.options.map((o, i) => ({ option_id: o.id, score: i ? -1 : 1 }));
  const second = f.options.map(o => ({ option_id: o.id, score: -1 }));
  const progress = wait(f.host.socket, 'vote_progress');
  f.host.socket.emit('submit_ballot', { pin: f.room.pin, participant_id: f.host.id, rankings: first });
  await Promise.all([progress, request(`/rooms/${f.room.pin}/votes`, { participant_id: f.host.id, device_id: f.host.device, rankings: second })]);
  const persisted = await prisma.vote.findMany({ where: { participantId: f.host.id } });
  const memory = activeVotingSessions.get(f.room.pin).submissions.get(f.host.id).votes;
  assert.equal(persisted.length, f.options.length);
  for (const vote of persisted) assert.equal(vote.score, memory.find(v => v.option_id === vote.optionId).score);
});

test('host removal is idempotent, hides private credentials, and guest rematches cannot change the result', async () => {
  const f = await fixture(); await start(f);
  const removed = wait(f.host.socket, 'lobby_roster_update');
  f.host.socket.emit('remove_participant', { pin: f.room.pin, participant_id: f.guest.id });
  const roster = await removed;
  assert.equal(roster.participants[0].id, f.host.id);
  assert.ok(!JSON.stringify(roster).includes(f.host.device));
  f.host.socket.emit('remove_participant', { pin: f.room.pin, participant_id: f.guest.id });
  await pause(20);
  assert.equal(activeVotingSessions.get(f.room.pin).expectedCount, 1);
  const result = wait(f.host.socket, 'winner_announced');
  f.host.socket.emit('submit_ballot', { pin: f.room.pin, participant_id: f.host.id, rankings: f.options.map(o => ({ option_id: o.id, score: -1 })) });
  const outcome = await result;
  assert.equal(outcome.status, 'NO_CONSENSUS'); assert.equal(outcome.matchScore, 0);
  assert.equal(outcome.support.liked, 0);
  const prior = activeVotingSessions.get(f.room.pin).winner.id;
  f.guest.socket.emit('quick_rematch', { pin: f.room.pin });
  await pause(20);
  assert.equal(activeVotingSessions.get(f.room.pin).winner.id, prior);
});

test('completed results recover from persisted ballots when all room session caches are lost', async () => {
  const f = await fixture(); await start(f);
  const done = wait(f.host.socket, 'winner_announced');
  const votes = f.options.map((o, i) => ({ option_id: o.id, score: i === 0 ? 1 : -1 }));
  for (const user of [f.host, f.guest]) user.socket.emit('submit_ballot', { pin: f.room.pin, participant_id: user.id, rankings: votes });
  const expected = await done;
  activeVotingSessions.delete(f.room.pin);
  activeLobbies.delete(f.room.pin);
  require('./sockets/socketSessionStore').roomSummaryCache.delete(f.room.pin);
  const peer = await connect();
  const restored = wait(peer, 'winner_announced');
  peer.emit('join_room', { pin: f.room.pin, participant_id: f.guest.id, device_id: f.guest.device });
  const result = await restored;
  assert.equal(result.winningOptionId, expected.winningOptionId);
  assert.deepEqual(result.support, expected.support);
  assert.equal(result.matchScore, expected.matchScore);
});

test('host migration grants the remaining verified member host controls and revokes the departed host', async () => {
  const f = await fixture();
  const left = wait(f.guest.socket, 'participant_left');
  f.host.socket.emit('leave_room', { pin: f.room.pin, participant_id: f.host.id });
  assert.equal((await left).host_id, f.guest.id);
  const ready = wait(f.guest.socket, 'voting_started');
  f.guest.socket.emit('host_start_voting', { pin: f.room.pin, host_id: f.guest.id, options: f.options });
  await ready;
  const denied = wait(f.host.socket, 'room_error');
  f.host.socket.emit('host_force_reveal', { pin: f.room.pin, host_id: f.host.id, host_token: f.room.host_token });
  await denied;
});

test('group price caps are enforced on the server snapshot and All clears the stored filter', async () => {
  const f = await fixture('DISCOVERY');
  f.options[1].price_level = 1;
  assert.equal((await request(`/rooms/${f.room.pin}/constraints`, { participant_id: f.guest.id, device_id: f.guest.device, max_price_level: 1 })).status, 200);
  const started = await start(f);
  assert.equal(started.options.length, 2);
  assert.ok(started.options.every(o => o.price_level === 1));
  assert.equal((await request(`/rooms/${f.room.pin}/constraints`, { participant_id: f.guest.id, device_id: f.guest.device, max_price_level: 4 })).status, 200);
  assert.equal((await prisma.participant.findUnique({ where: { id: f.guest.id } })).budgetCap, 4);
});

test('empty and duplicate-ID decks are rejected before a session is created', async () => {
  const f = await fixture();
  for (const options of [[], [f.options[0], f.options[0]]]) {
    const denied = wait(f.host.socket, 'room_error');
    f.host.socket.emit('host_start_voting', { pin: f.room.pin, host_id: f.host.id, options });
    await denied;
    assert.equal(activeVotingSessions.has(f.room.pin), false);
  }
});

test('production administration fails closed without an admin key, even with forged forwarding headers', async () => {
  const oldEnv = process.env.NODE_ENV; const oldKey = process.env.ADMIN_API_KEY;
  try {
    process.env.NODE_ENV = 'production'; delete process.env.ADMIN_API_KEY;
    assert.equal((await request('/system/telemetry', undefined, 'GET', { 'x-forwarded-for': '127.0.0.1' })).status, 403);
    assert.equal((await request('/system/prune', {}, 'POST', { 'x-forwarded-for': '127.0.0.1' })).status, 403);
  } finally {
    if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
    if (oldKey === undefined) delete process.env.ADMIN_API_KEY; else process.env.ADMIN_API_KEY = oldKey;
  }
});

test('a removed participant’s price cap cannot constrain the remaining group', async () => {
  const f=await fixture('DISCOVERY');
  assert.equal((await request(`/rooms/${f.room.pin}/constraints`,{participant_id:f.guest.id,device_id:f.guest.device,max_price_level:1})).status,200);
  const removed=wait(f.host.socket,'lobby_roster_update');f.host.socket.emit('remove_participant',{pin:f.room.pin,participant_id:f.guest.id});await removed;
  const snapshot=await start(f);assert.equal(snapshot.options.length,3);
});

test('configuration cannot reset the durable voting state machine after voting starts', async () => {
  const f=await fixture();await start(f);
  const response=await request(`/rooms/${f.room.room_id}/config`,{pin:f.room.pin,host_id:f.host.id,device_id:f.host.device,status:'CONFIGURING'},'PATCH');
  assert.equal(response.status,409);
  assert.equal((await prisma.room.findUnique({where:{pin:f.room.pin}})).status,'VOTING');
});
