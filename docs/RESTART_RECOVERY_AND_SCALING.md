# Restart recovery and scaling — implementation and local verification

26 October 2026. Follow-up to the [security and flow audit](SECURITY_AND_FLOW_AUDIT.md). This report records the local verification before deployment. The subsequent migration, deployment and live checks are recorded in [the production rollout report](PRODUCTION_ROLLOUT_2026-10-26.md).

## Result

Unfinished rooms now have durable state and can resume after an abrupt backend stop. Separate backend processes coordinate the same room through PostgreSQL and broadcast to clients on either process.

The local checks passed for setup recovery, partial voting recovery, cross-server voting and retries, host failover, expiry, rollback, a real PostgreSQL outage, fresh/upgrade migrations, Chromium, WebKit, and a 1,000-client rehearsal. These are local results, not a production capacity or availability guarantee.

## Changes

### Durable room state

`Room.runtimeState` stores a versioned snapshot containing:

- Participants, names, current host, private device bindings, and presence leases.
- Custom suggestions, authorship, group settings, displayed pool size, removed options, and removed-member credentials.
- The exact selected deck and metadata, eligible voter IDs, quorum, accepted ballots, and voting mode/topic.
- The resolved result, ranked alternatives, rematch position, support statistics, and expiry timestamps.

Snapshots stay server-side. Public participant serialization still excludes private device credentials and budget amounts.

Every room operation reads the latest snapshot under a PostgreSQL row lock. Its related database changes and new snapshot commit together. Socket messages and successful HTTP responses are delivered after commit. A failed transaction discards the staged messages and clears the local cache, so another server or reconnect reads the last accepted state.

The existing Prisma helpers join that room transaction through a request-scoped context. They do not open a second transaction that would wait on the first transaction's lock. Different rooms can proceed concurrently.

### Multiple servers

The official PostgreSQL Socket.IO adapter carries broadcasts and remote socket operations between backend processes. It uses a direct PostgreSQL connection for `LISTEN`/`NOTIFY`; ordinary Prisma traffic can continue using the pooled connection.

HTTP rate limits now use atomic shared database counters. Restarting or switching servers does not grant another request budget. The original production thresholds were retained. Simulated IPs in the mixed HTTP load test are trusted only by the test workers' local proxy configuration.

The default transport is WebSocket-only, which avoids HTTP polling session affinity. Polling can be enabled explicitly only when the deployment provides sticky sessions.

### Recovery and lifecycle

- Browser reconnects restore the authoritative card snapshot even when a partially completed local ballot exists. Router-provided card state is not required.
- Visible clients renew presence while swiping, waiting, or viewing the result. A persisted sweep can transfer host rights after a server dies; it does not silently shrink the voting quorum.
- A stale disconnect timer rereads durable state before transferring host rights, protecting someone who reconnected to another server.
- Persisted expiry prevents a restarted server from reopening an expired room.
- Readiness checks the schema, database, and broadcast subscription. It returns 503 during a database outage.
- Live PostgreSQL subscription clients have error handlers as well as pool-level handlers. This fixed a worker crash reproduced by stopping PostgreSQL.
- Shutdown drains room work and closes sockets/subscriptions cleanly. Recovery also works after `SIGKILL`, where graceful shutdown cannot run.

### Browser and offline repairs

The production build now precaches its actual hashed JavaScript/CSS assets and uses a build-specific cache name. This closes the first-visit offline gap where the shell was cached but its application chunks were not. Cache cleanup only removes this app's caches.

Service-worker update promises are handled, development mode avoids production service workers, and a worker update does not force a reload during an active room. The production shell was tested with the origin server actually stopped. This avoids a [documented Playwright WebKit offline-emulation issue](https://github.com/microsoft/playwright/issues/42775).

Other repairs include ignoring removed members' price caps, preventing configuration from resetting active voting, adding labels to code-entry inputs, removing duplicate translation definitions, and moving gesture/socket callback updates out of render.

## Local evidence

| Verification | Result |
| --- | --- |
| Server security, functional, restart, and cluster tests | **58 passed, 0 failed, 0 skipped** |
| Client drawer/gesture utility tests | **3 passed** |
| Chromium production build | Headers, first-visit offline shell, two backend crashes, partial ballot recovery, shared result, and full user flows pass |
| WebKit production build | Same production, outage, restart, and user-flow scenarios pass |
| Real PostgreSQL stop/restart | Readiness fails closed, attempted ballot is rejected, saved ballot survives, retry resolves correctly |
| Fresh installation | All four migrations apply and the resulting database matches the Prisma schema |
| Existing-data upgrade | Baseline/upgrade preserves room, participant, option, and ballot data; repeat deploy is a no-op |
| Dependency checks | Zero known advisories in the client and server dependency trees |
| Client production build | Passes; offline asset preparation runs as part of the build |
| Client lint | No reported errors; warnings reduced from 73 to **40** |

The browser scenarios include invite links, two-person rosters, details, pause/resume, ballot completion and quorum, result refresh, an actual database feedback failure followed by a successful retry, shared rematches, history reopening, and custom polls. No unhandled browser exceptions occurred in the successful runs.

Evidence is saved under [recovery-scaling-2026-10-26](recovery-scaling-2026-10-26/). The scripts use only disposable local databases and loopback app servers.

### Load rehearsal

| Scenario | Connected clients | Rooms / backend processes | Stored vote rows | Result delivery |
| --- | --- | --- | --- | --- |
| Socket voting | 1,000 | 20 / 2 | 2,000 | Every client received the correct result; zero errors |
| Mixed HTTP/socket voting | 1,000 | 20 / 2 | 2,000 | Every client received the correct result; zero errors |

The mixed run performed 1,000 room lookups, 500 REST ballots, and 500 socket ballots, with **50 concurrent HTTP requests** and distinct simulated client IPs. Its measured ballot-to-result p95 was about **1.4 seconds**. Backend resident memory was approximately **143–152 MiB per process** at the measurement point. Exact measurements are in the saved JSON.

The socket-only run used one client IP and remained within the existing HTTP budgets. HTTP clients behind a large shared NAT are intentionally subject to a shared IP budget; the mixed run does not establish 1,000 unrestricted HTTP users behind one IP.

An unbounded 500-request HTTP connection burst encountered local connection resets in the test driver. The successful mixed rehearsal used a bounded HTTP pool and is reported with that limit. It must not be presented as a successful unbounded burst test, sustained soak test, WAN benchmark, or sizing recommendation for the hosted database.

## Deployment order — complete before a Git push

The project auto-deploys from Git. **Do not push this change before the database and environment are ready.** The new backend checks its required schema before listening.

1. Complete or end existing rooms created by the old version, and take a database backup/restore point. Previously unpersisted suggestions or selected decks cannot be reconstructed retroactively. The new server rejects an old unfinished room without a recoverable snapshot rather than inventing its state.
2. Set the same long random `HOST_TOKEN_SECRET` on every backend instance. Production startup rejects a missing, short, or example placeholder secret. Keep `ADMIN_API_KEY` for system operations and configure only the actual trusted proxy ranges.
3. Use the same database/branch for application traffic and socket broadcasts. `SOCKET_DATABASE_URL` or `DIRECT_URL` can supply the direct connection. For Neon, an omitted socket URL is derived from the same endpoint by removing `-pooler`; a conflicting endpoint/database is rejected.
4. Review migration status using the direct database connection. The old repository lacked an initial schema migration. On an existing installation whose core tables already exist, mark the new initial baseline as applied **only after verifying those tables match it**. Do not apply its CREATE statements over existing tables.
5. Run the tested migration deployment against the intended database, then generate/build the code. No migration or baseline command was run against the configured hosted database during this task.

```sh
# For an existing database, only after the baseline verification above:
npm --prefix server run migrate:baseline

# For both new and correctly baselined existing databases:
npm --prefix server run migrate:deploy
npm run build
```

Run these in a migration environment whose `DATABASE_URL` is the intended **direct** connection. The migration adds `runtimeState`, shared rate counters, and Socket.IO attachment storage. It also aligns the earlier cached-venue timestamp default with the existing Prisma model.

6. Deploy, probe `/ready`, and smoke-test a room whose host and guest use different replicas. For later deployments, verify restart recovery with a real room before expanding traffic.

WebSocket-only is the default. If polling is required, configure sticky routing and set both `SOCKET_POLLING=true` on the server and `VITE_SOCKET_POLLING=true` at client build time. Keep the rate-limit namespace the same across replicas.

## Repeatable local commands

Use a disposable local PostgreSQL database whose name contains `test` and initialize it from the schema. The bootstrap rejects remote test databases and disables activity webhooks.

```sh
TEST_DATABASE_URL="$LOCAL_AUDIT_DATABASE_URL" npm --prefix server test
TEST_DATABASE_URL="$LOCAL_AUDIT_DATABASE_URL" node scripts/rehearse-migrations.cjs
TEST_DATABASE_URL="$LOCAL_AUDIT_DATABASE_URL" AUDIT_USERS=1000 AUDIT_GROUP_SIZE=50 node scripts/cluster-load-test.cjs
node --test client/src/components/ui/drawerMotion.test.js
npm --prefix client run lint
npm run build
```

`scripts/restart-browser-test.cjs` starts its own local frontend/backend. Set `AUDIT_PRODUCTION=true` and `AUDIT_FULL_BROWSER=true` to include the production shell and all browser scenarios; select `AUDIT_BROWSER=webkit` for WebKit. Provide installed Playwright/browser paths where needed.

`scripts/database-outage-test.cjs` creates a separate temporary PostgreSQL cluster through an installed `embedded-postgres` test runtime, stops/restarts it, and removes only its own temporary data. It does not stop the database used by the other tests.

## Remaining validation boundaries

- No live rollout, real hosted load test, or physical iPhone/Android test was performed. Native installation, sharing, sensors, and notification permission behavior still need device checks.
- Browser-suspended delayed notifications cannot be guaranteed by a service-worker timer. The return-to-app reminder remains the reliable application fallback; a guaranteed background notification requires an appropriately configured push service.
- Forty non-failing lint warnings remain, mostly effect synchronization/dependencies and development refresh exports. They are recorded rather than hidden. A large client bundle warning also remains; this task does not claim warning-clean static analysis.
- Four-digit PINs still implement the established anonymous invitation flow. They are not high-entropy authorization for confidential rooms. This change protects member/host actions but does not turn the product into an account-authenticated private-room service.
- Live venue/provider facts, external quotas, cloud network latency, operating-system background behavior, and long-duration capacity remain outside the local evidence.

## Implementation references

- [Room transaction coordinator](../server/src/state/roomCoordinator.js)
- [Cross-server broadcast setup](../server/src/state/realtimeCluster.js)
- [Shared rate budgets](../server/src/state/sharedRateLimit.js)
- [Crash and cluster regressions](../server/src/restartAndCluster.test.js)
- [Load driver](../scripts/cluster-load-test.cjs)
- [Production/restart browser driver](../scripts/restart-browser-test.cjs)
- [Migration rehearsal](../scripts/rehearse-migrations.cjs)
- [Database-outage rehearsal](../scripts/database-outage-test.cjs)
- [Socket.IO PostgreSQL adapter documentation](https://socket.io/docs/v4/postgres-adapter/)
