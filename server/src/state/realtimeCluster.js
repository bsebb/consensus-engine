const { Pool } = require('pg');
const { createAdapter } = require('@socket.io/postgres-adapter');

function directSocketUrl() {
  const raw = process.env.SOCKET_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is required');
  const url = new URL(raw);
  const application = new URL(process.env.DATABASE_URL || raw);
  if (url.pathname !== application.pathname) throw new Error('Socket and application database names must match');
  if (application.hostname.endsWith('.neon.tech') && url.hostname.replace('-pooler.', '.') !== application.hostname.replace('-pooler.', '.')) {
    throw new Error('Socket and application connections must use the same Neon endpoint');
  }
  // LISTEN is session-scoped. Neon's transaction pooler cannot preserve it.
  if (url.hostname.endsWith('.neon.tech')) url.hostname = url.hostname.replace('-pooler.', '.');
  else if (url.hostname.includes('-pooler.')) throw new Error('Set SOCKET_DATABASE_URL to a direct PostgreSQL connection');
  for (const key of ['pgbouncer', 'connection_limit', 'pool_timeout', 'connect_timeout']) url.searchParams.delete(key);
  return url.toString();
}

async function initializeRealtime(io) {
  const pool = new Pool({ connectionString: directSocketUrl(), max: 3, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
  pool.on('error', error => console.error('[Realtime database]', error.code || error.name));
  // The adapter holds a checked-out LISTEN client. Pool-level error listeners only
  // cover idle clients, so every live client also needs its own error handler.
  pool.on('connect', client => client.on('error', error => console.error('[Realtime connection]', error.code || error.name)));
  // Schema changes are applied through migrations, never by a running web server.
  await pool.query('SELECT id FROM socket_io_attachments LIMIT 0');
  await pool.query('SELECT \"runtimeState\" FROM rooms LIMIT 0');
  await pool.query('SELECT key FROM api_rate_limits LIMIT 0');
  io.adapter(createAdapter(pool, {
    heartbeatInterval: 1000, heartbeatTimeout: 5000,
    errorHandler: error => console.error('[Realtime adapter]', error.code || error.name),
  }));
  const adapter = io.of('/').adapter;
  // The pinned adapter exposes its initialized LISTEN client after subscriptions finish.
  const deadline = Date.now() + 8000;
  while (!adapter.client.client) {
    if (Date.now() > deadline) { await io.close(); await pool.end(); throw new Error('Realtime subscription could not start'); }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  const cleanup = setInterval(() => pool.query('DELETE FROM api_rate_limits WHERE "resetAt" < NOW()').catch(() => {}), 60000);
  cleanup.unref();
  let closing;
  return { pool, isReady: () => Boolean(adapter.client.client), close: () => { clearInterval(cleanup); return closing ||= pool.end(); } };
}
module.exports = { directSocketUrl, initializeRealtime };
