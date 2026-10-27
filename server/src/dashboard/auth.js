const crypto = require('node:crypto');
const { rootPrisma: db } = require('../../db/prismaClient');
const COOKIE = '__Host-nyp_dashboard';
const CHALLENGE_COOKIE = '__Host-nyp_dashboard_challenge';
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');
function cookie(req, name) {
  const entry = String(req.headers.cookie || '')
    .split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + '='));
  return entry?.slice(name.length + 1) || '';
}
function validToken(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}
function setCookie(res, name, value, maxAge) {
  res.append(
    'Set-Cookie',
    `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
  );
}
function settings() {
  const origin = process.env.DASHBOARD_ORIGIN || 'https://www.noyoupick.org';
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    (url.protocol !== 'https:' && url.hostname !== 'localhost')
  )
    throw new Error('Invalid dashboard origin');
  return { origin, rpID: url.hostname, rpName: 'NoYouPick owner dashboard' };
}
function sameOrigin(req, res, next) {
  if (req.headers.origin !== settings().origin)
    return res.status(403).json({ error: 'Request not allowed.' });
  if (!req.is('application/json'))
    return res.status(415).json({ error: 'Use JSON.' });
  next();
}
async function setupTokenValid(value) {
  if (typeof value !== 'string' || !/^\d{13}\.[A-Za-z0-9_-]{43}$/.test(value))
    return false;
  const age = Date.now() - Number(value.split('.')[0]);
  if (age < -300000 || age > 24 * 3600000) return false;
  const owner = await db.dashboardOwner.findUnique({ where: { id: 'owner' } });
  const expected = !owner?.enrolled && owner?.setupTokenHash;
  return (
    typeof value === 'string' &&
    value.length >= 32 &&
    value.length <= 128 &&
    /^[a-f0-9]{64}$/.test(expected || '') &&
    crypto.timingSafeEqual(Buffer.from(hash(value)), Buffer.from(expected))
  );
}
async function authenticate(req) {
  const raw = cookie(req, COOKIE);
  if (!validToken(raw)) return null;
  const session = await db.dashboardSession.findUnique({
    where: { id: hash(raw) },
  });
  return session?.expiresAt > new Date() ? session : null;
}
async function requireSession(req, res, next) {
  try {
    if (!(await authenticate(req)))
      return res.status(401).json({ error: 'Please sign in.' });
    next();
  } catch {
    res.status(503).json({ error: 'Dashboard temporarily unavailable.' });
  }
}
async function newSession(res) {
  const raw = token();
  await db.dashboardSession.create({
    data: { id: hash(raw), expiresAt: new Date(Date.now() + 8 * 3600000) },
  });
  setCookie(res, COOKIE, raw, 8 * 3600);
}
async function challenge(res, purpose, value) {
  const raw = token();
  const id = token();
  await db.dashboardChallenge.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  await db.dashboardSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  await db.dashboardChallenge.create({
    data: {
      id,
      challenge: value,
      purpose,
      binding: hash(raw),
      expiresAt: new Date(Date.now() + 5 * 60000),
    },
  });
  setCookie(res, CHALLENGE_COOKIE, raw, 300);
  return id;
}
async function consumeChallenge(req, res, purpose) {
  const id = req.body?.challengeId;
  const raw = cookie(req, CHALLENGE_COOKIE);
  if (!validToken(id) || !validToken(raw)) return null;
  // One atomic delete makes challenges single-use across all replicas.
  const rows =
    await db.$queryRaw`DELETE FROM dashboard_challenges WHERE id = ${id} AND purpose = ${purpose} AND binding = ${hash(raw)} AND "expiresAt" > NOW() RETURNING challenge`;
  setCookie(res, CHALLENGE_COOKIE, '', 0);
  return rows[0]?.challenge || null;
}
module.exports = {
  db,
  COOKIE,
  CHALLENGE_COOKIE,
  cookie,
  hash,
  token,
  validToken,
  setCookie,
  settings,
  sameOrigin,
  setupTokenValid,
  authenticate,
  requireSession,
  newSession,
  challenge,
  consumeChallenge,
};
