// Tests must never inherit the developer's live database or external webhook.
const target = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/consensus_test';
const parsed = new URL(target);
if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) || !parsed.pathname.includes('test')) {
  throw new Error('Tests require a local TEST_DATABASE_URL whose database name contains test.');
}
process.env.DATABASE_URL = target;
process.env.ALERT_WEBHOOK_URL = '';
process.env.HOST_TOKEN_SECRET = 'isolated-test-host-secret-never-use-in-production';

process.env.RATE_LIMIT_NAMESPACE = process.env.TEST_RATE_LIMIT_NAMESPACE || `isolated-test-${process.pid}`;
