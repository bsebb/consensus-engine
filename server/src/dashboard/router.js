const express = require('express');
const webauthn = require('@simplewebauthn/server');
const a = require('./auth');
const { createRateLimiter } = require('../utils/rateLimiter');
const { analytics } = require('./analytics');
const router = express.Router();
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, private');
  res.set('Pragma', 'no-cache');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
});
// The public app permits several origins; private dashboard reads permit only
// the canonical dashboard origin, including sibling-subdomain requests.
router.use((req, res, next) => {
  if (req.headers.origin && req.headers.origin !== a.settings().origin) {
    res.removeHeader('Access-Control-Allow-Origin');
    res.removeHeader('Access-Control-Allow-Credentials');
    return res.status(403).json({ error: 'Request not allowed.' });
  }
  next();
});
const authLimit = createRateLimiter({
  scope: 'dashboard-auth',
  windowMs: 60000,
  max: 10,
});
router.use(
  createRateLimiter({ scope: 'dashboard', windowMs: 60000, max: 120 })
);
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(() =>
    res
      .status(503)
      .json({ error: 'Dashboard temporarily unavailable. Please try again.' })
  );
router.get(
  '/session',
  wrap(async (req, res) =>
    res.json({ authenticated: Boolean(await a.authenticate(req)) })
  )
);
router.post(
  '/register/options',
  a.sameOrigin,
  authLimit,
  wrap(async (req, res) => {
    if (!(await a.setupTokenValid(req.body?.setupToken)))
      return res
        .status(403)
        .json({ error: 'A valid owner setup link is required.' });
    const owner = await a.db.dashboardOwner.findUnique({
      where: { id: 'owner' },
    });
    if (!owner || owner.enrolled)
      return res
        .status(409)
        .json({
          error: 'Owner access is already set up. Sign in with your passkey.',
        });
    const { origin, ...rp } = a.settings();
    const options = await webauthn.generateRegistrationOptions({
      ...rp,
      userName: 'NoYouPick owner',
      userID: new TextEncoder().encode('noyoupick-dashboard-owner'),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
      supportedAlgorithmIDs: [-7, -257],
    });
    res.json({
      options,
      challengeId: await a.challenge(res, 'register', options.challenge),
    });
  })
);
router.post(
  '/register/verify',
  a.sameOrigin,
  authLimit,
  wrap(async (req, res) => {
    if (!(await a.setupTokenValid(req.body?.setupToken)))
      return res
        .status(403)
        .json({ error: 'A valid owner setup link is required.' });
    const expectedChallenge = await a.consumeChallenge(req, res, 'register');
    if (!expectedChallenge)
      return res
        .status(400)
        .json({ error: 'Setup expired. Please start again.' });
    let result;
    try {
      const s = a.settings();
      result = await webauthn.verifyRegistrationResponse({
        response: req.body.response,
        expectedChallenge,
        expectedOrigin: s.origin,
        expectedRPID: s.rpID,
        requireUserVerification: true,
      });
    } catch {
      return res.status(400).json({ error: 'Passkey verification failed.' });
    }
    if (!result.verified)
      return res.status(400).json({ error: 'Passkey verification failed.' });
    const c = result.registrationInfo.credential;
    const enrolled = await a.db.$transaction(async (tx) => {
      const [owner] =
        await tx.$queryRaw`SELECT enrolled FROM dashboard_owner WHERE id='owner' FOR UPDATE`;
      if (!owner || owner.enrolled) return false;
      await tx.dashboardCredential.create({
        data: {
          id: c.id,
          publicKey: Buffer.from(c.publicKey),
          counter: BigInt(c.counter),
          transports: c.transports || [],
        },
      });
      await tx.dashboardOwner.update({
        where: { id: 'owner' },
        data: { enrolled: true, setupTokenHash: null },
      });
      return true;
    });
    if (!enrolled)
      return res.status(409).json({ error: 'Owner access is already set up.' });
    await a.newSession(res);
    res.json({ authenticated: true });
  })
);
router.post(
  '/login/options',
  a.sameOrigin,
  authLimit,
  wrap(async (req, res) => {
    const options = await webauthn.generateAuthenticationOptions({
      rpID: a.settings().rpID,
      userVerification: 'required',
    });
    res.json({
      options,
      challengeId: await a.challenge(res, 'login', options.challenge),
    });
  })
);
router.post(
  '/login/verify',
  a.sameOrigin,
  authLimit,
  wrap(async (req, res) => {
    const expectedChallenge = await a.consumeChallenge(req, res, 'login');
    if (!expectedChallenge)
      return res
        .status(400)
        .json({ error: 'Sign-in expired. Please start again.' });
    const id = req.body?.response?.id;
    if (typeof id !== 'string' || id.length > 2048)
      return res.status(400).json({ error: 'Passkey verification failed.' });
    const credential = await a.db.dashboardCredential.findUnique({
      where: { id },
    });
    if (!credential)
      return res.status(401).json({ error: 'Passkey verification failed.' });
    let result;
    try {
      const s = a.settings();
      result = await webauthn.verifyAuthenticationResponse({
        response: req.body.response,
        expectedChallenge,
        expectedOrigin: s.origin,
        expectedRPID: s.rpID,
        requireUserVerification: true,
        credential: {
          id: credential.id,
          publicKey: new Uint8Array(credential.publicKey),
          counter: Number(credential.counter),
          transports: credential.transports,
        },
      });
    } catch {
      return res.status(401).json({ error: 'Passkey verification failed.' });
    }
    if (!result.verified)
      return res.status(401).json({ error: 'Passkey verification failed.' });
    // Conditional update prevents a concurrent assertion from rolling the counter back.
    const updated = await a.db.dashboardCredential.updateMany({
      where: { id, counter: credential.counter },
      data: { counter: BigInt(result.authenticationInfo.newCounter) },
    });
    if (!updated.count)
      return res.status(409).json({ error: 'Please retry sign-in.' });
    await a.newSession(res);
    res.json({ authenticated: true });
  })
);
router.post(
  '/logout',
  a.sameOrigin,
  wrap(async (req, res) => {
    const raw = a.cookie(req, a.COOKIE);
    if (a.validToken(raw))
      await a.db.dashboardSession.deleteMany({ where: { id: a.hash(raw) } });
    a.setCookie(res, a.COOKIE, '', 0);
    res.json({ authenticated: false });
  })
);
router.get(
  '/analytics',
  a.requireSession,
  wrap(async (req, res) => {
    const days = Number(req.query.days || 30);
    if (![7, 30, 90].includes(days))
      return res.status(400).json({ error: 'Choose 7, 30 or 90 days.' });
    res.json(await analytics(days));
  })
);
module.exports = router;
