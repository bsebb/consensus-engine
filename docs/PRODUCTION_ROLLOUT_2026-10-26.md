# Production rollout and live verification

26 October 2026. Application release `aac67f88259d3a5665359b9b1fc46480de61e4b0` is live at https://noyoupick.org (the apex redirects to https://www.noyoupick.org). Render deployment `dep-dbfre4m417fc73er1h6g` reached `live` at 20:25:34 UTC. The subsequent evidence/test-harness commit uses `[skip render]` because it changes no application runtime code.

## Database and configuration

- Verified the supplied Neon production endpoint belongs to `NoYouPick`, project `bitter-paper-14349642`, production branch `br-sparkling-dust-ba3pai1k`.
- Created a pre-migration backup branch, `br-bitter-dust-ba6irt87` (`codex-rollout-backup-20261026-202054`), without compute. It expires automatically on **2 November 2026 at 20:20:54 UTC**.
- Rehearsed the baseline and migration on a separate production-data branch, checked the final schema and all seven application-table checksums, then removed only that temporary rehearsal branch.
- Production exactly matched the old Prisma schema and had no migration history. Marked the verified initial migration as applied, deployed the remaining three migrations through a direct connection, and confirmed the new schema matches Prisma exactly.
- All production rows were unchanged during migration: 352 rooms, 503 participants, 9,901 options, 210 votes, 3 feedback rows, 7 venue analytics rows, and 711 cached venues. Before/after table checksums match.
- Verified Render workspace `tea-dadc8r9t0dsc73d0nhig` and existing service `srv-dbaabf7btjjs73eddig0`. There is no Blueprint; the service configuration is the source of truth.
- Preserved existing variables and added a random stable host-signing secret, administrator secret, direct database URL, production mode, client URL, WebSocket-only setting, and explicit private/loopback/link-local proxy trust. No secret values are included in source or evidence.
- Set the Render build command to `npm ci && npm run build`, retained `npm start`, and set the HTTP health check to `/ready`.
- Retained the existing **free plan and one instance**. The code supports multiple backend processes, but hosted horizontal scaling was not enabled or purchased.

## Verification

| Check | Result |
| --- | --- |
| Fresh local server tests | 58 passed, 0 failed/skipped |
| Client utility tests | 3 passed |
| Client lint / production build | No lint errors; 40 existing warnings; build passed |
| Live Chromium mobile host + desktop guest | Passed full flow |
| Live WebKit mobile host + desktop guest | Passed full flow |
| Actual live Render restart during unfinished voting | Passed |
| Exact persisted seven-card deck and submitted guest ballot before/after restart | Identical hash |
| Host partial local ballot after restart | Restored; remaining votes resolved one shared result |
| Live feedback rejection/retry | Browser-injected 503 stays editable; real retry persists |
| Host rematch, saved history, winner reopening | Passed in both engines |
| Solo custom poll and winner refresh | Passed in both engines |
| Unhandled browser exceptions | Zero in successful runs |
| Live PWA control and full asset precache | Six build assets cached in both engines |
| Chromium live offline navigation | App shell loads without network |
| Live security headers, CORS, administration | CSP/frame restrictions present; untrusted origin gets no CORS permission; unauthenticated and forged-loopback admin requests return 403 |
| Readiness and post-restart logs | `/ready` 200; 49 log entries inspected with no error entries and no remaining page |

The full browser flow covers room creation, theme switching, invite code prefill, joining, synchronized rosters, guest permissions, host reload, candidate addition, synchronized voting, details/maps links, pause/resume, waiting quorum, identical results, result reload, review failure/retry, shared runner-up rematch, history reopening, custom polls and mobile horizontal overflow checks. Screenshots were inspected.

Render's restart API returned 200 and restarted the process without creating a separate deployment record. Fresh startup logs at 20:27:16–20:27:20 UTC and reset health uptime confirmed the process actually restarted. The voting-state hash was checked before allowing the browser to continue.

The first WebKit attempt failed at the **test's injected failure**, because service-worker handling bypassed Playwright's request interception and the real feedback request succeeded. No browser exception occurred. The live smoke harness now blocks service workers only in its test contexts to make injection deterministic; the complete WebKit rerun passed. A separate live PWA test used normal service-worker contexts in both engines. WebKit offline-origin loss remains covered by the earlier local test that actually stopped the origin, rather than its unreliable offline-emulation setting. See [Playwright's routing guidance](https://playwright.dev/docs/api/class-page#page-route).

After verifying saved outcomes, cleaned up exactly five test-created rooms and their dependent ballots/feedback, and removed the three test feedback contributions from community averages. No general prune or reset was run. The initial cleanup safety check rejected a local-time interpretation of PostgreSQL's timezone-less timestamps; its transaction rolled back. The completed cleanup explicitly interprets Prisma timestamps as UTC.

## Limits

This was a small live functional verification, not a live load or soak test. The prior 1,000-client/two-server rehearsal remains local evidence only. Physical iOS/Android installation and background notification behavior were not tested. Free-plan sleep and single-instance limits remain. Rooms created by the old server without runtime snapshots cannot gain recovery retroactively.

Three live readiness calls with different forged forwarding headers consumed the same observed budget and created no budget under the spoofed identities. Per-client IP attribution across real carriers and multiple independent public networks was not measured. Production rate-limit thresholds were not raised.

Evidence: [production-rollout-2026-10-26](production-rollout-2026-10-26/). The earlier [restart/scaling report](RESTART_RECOVERY_AND_SCALING.md) records local recovery, cluster, migration, browser and load testing.
