// Creates one expiring first-owner invitation. Refuses to reset an enrolled owner.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { Client } = require('../server/node_modules/pg');
(async () => {
  if (!process.env.DATABASE_URL)
    throw new Error('Supply the intended direct DATABASE_URL.');
  const parsed = new URL(process.env.DATABASE_URL);
  if (parsed.hostname.includes('-pooler.'))
    throw new Error('Use a direct database connection.');
  const target = path.resolve(
    process.env.DASHBOARD_SETUP_FILE ||
      path.join(__dirname, '../.private/dashboard-setup.md')
  );
  const setupToken = Date.now() + '.' + randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(setupToken).digest('hex');
  const client = new Client({ connectionString: parsed.toString() });
  await client.connect();
  try {
    const result = await client.query(
      'UPDATE dashboard_owner SET "setupTokenHash"=$1 WHERE id=$2 AND enrolled=false AND NOT EXISTS (SELECT 1 FROM dashboard_credentials) RETURNING id',
      [hash, 'owner']
    );
    if (result.rowCount !== 1)
      throw new Error(
        'Owner already enrolled or migration missing. Nothing was reset.'
      );
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    fs.writeFileSync(
      target,
      `# Your private NoYouPick dashboard\n\n[Create your owner passkey](https://www.noyoupick.org/dashboard#setup=${setupToken})\n\nOpen the link in Safari or Chrome on your own device. Choose **Create my passkey**, then confirm with Face ID, Touch ID, your device PIN or security key.\n\nThis one-time link expires after 24 hours and stops working as soon as your passkey is registered. Keep it private until then.\n\nAfter setup, sign in at [noyoupick.org/dashboard](https://noyoupick.org/dashboard).\n`,
      { mode: 0o600 }
    );
    fs.chmodSync(target, 0o600);
    console.log('Private owner setup guide created at ' + target);
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error(error.code || error.message);
  process.exitCode = 1;
});
