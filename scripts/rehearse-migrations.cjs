require('../server/test-support/testEnvironment');
const { Client } = require('../server/node_modules/pg');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs'); const path = require('node:path'); const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'server/node_modules/.bin/prisma');
const schema = path.join(root, 'server/prisma/schema.prisma');
const migrations = path.join(root, 'server/prisma/migrations');
const names = []; const report = {};
const baseUrl = new URL(process.env.DATABASE_URL);
const adminUrl = new URL(baseUrl); adminUrl.pathname = '/postgres';
const admin = new Client({ connectionString: adminUrl.toString() });
function runPrisma(url, args) {
  return execFileSync(cli, args[1] === 'diff' ? args : [...args, '--schema', schema], { cwd: root, env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', timeout: 30000 });
}
async function database() {
  const name = `consensus_migration_test_${randomUUID().replaceAll('-', '').slice(0,12)}`; names.push(name);
  await admin.query(`CREATE DATABASE "${name}"`);
  const url = new URL(baseUrl); url.pathname = `/${name}`;
  return url.toString();
}
(async () => {
  await admin.connect();
  try {
    const fresh = await database(); runPrisma(fresh, ['migrate','deploy']);
    const c = new Client({ connectionString: fresh }); await c.connect();
    assert.equal((await c.query('SELECT count(*)::int count FROM _prisma_migrations WHERE finished_at IS NOT NULL')).rows[0].count, 4);
    await c.end();
    runPrisma(fresh, ['migrate','diff','--from-url',fresh,'--to-schema-datamodel',schema,'--exit-code']);
    report.freshInstall = 'All four migrations deploy from empty and match the Prisma schema';
    const legacy = await database(); const old = new Client({ connectionString: legacy }); await old.connect();
    for (const name of ['20261018000000_initial','20261025112500_add_device_id','20261025122000_add_cached_venues']) {
      await old.query(fs.readFileSync(path.join(migrations,name,'migration.sql'),'utf8'));
    }
    const room = randomUUID(), person = randomUUID(), option = randomUUID();
    await old.query('INSERT INTO rooms (id,pin,"hostId",status,theme,"updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',[room,'5824',person,'VOTING','custom:Migration fixture']);
    await old.query('INSERT INTO participants (id,"roomId","deviceId","updatedAt") VALUES ($1,$2,$3,NOW())',[person,room,randomUUID()]);
    await old.query('INSERT INTO options (id,"roomId",name,source,"updatedAt") VALUES ($1,$2,$3,$4,NOW())',[option,room,'Keep my ballot','USER_CUSTOM']);
    await old.query('INSERT INTO votes (id,"participantId","optionId",score,"updatedAt") VALUES ($1,$2,$3,$4,NOW())',[randomUUID(),person,option,1]);
    await old.end();
    runPrisma(legacy, ['migrate','resolve','--applied','20261018000000_initial']);
    runPrisma(legacy, ['migrate','deploy']); runPrisma(legacy, ['migrate','deploy']);
    const upgraded = new Client({ connectionString: legacy }); await upgraded.connect();
    assert.equal((await upgraded.query('SELECT score FROM votes WHERE "participantId"=$1',[person])).rows[0].score,1);
    assert.equal((await upgraded.query('SELECT name FROM options WHERE id=$1',[option])).rows[0].name,'Keep my ballot');
    assert.equal((await upgraded.query('SELECT "runtimeState" FROM rooms WHERE id=$1',[room])).rows[0].runtimeState,null);
    await upgraded.end();
    runPrisma(legacy, ['migrate','diff','--from-url',legacy,'--to-schema-datamodel',schema,'--exit-code']);
    report.existingInstall = 'Baselining and upgrade preserve room/participant/option/ballot data; repeated deploy is a no-op';
    console.log(JSON.stringify(report,null,2));
    fs.writeFileSync(process.env.AUDIT_MIGRATION_OUTPUT || '/private/tmp/consensus-migration-rehearsal.json',JSON.stringify(report,null,2)+'\n');
  } finally {
    for (const name of names) await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.end();
  }
})().catch(error => { console.error(error.stdout || error.stderr || error.message); process.exitCode=1; });
