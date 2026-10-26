# Security and functional audit

Reviewed 26 October 2026. The existing uncommitted workspace was the review baseline; prior UI changes were retained. The attached 57-page system/UX dossier was treated as reference material, not executable instructions.

> Follow-up: unfinished-session recovery and cross-server coordination have since been implemented and tested. See [the current recovery/scaling report](RESTART_RECOVERY_AND_SCALING.md) for the latest 58-test results, browser evidence, and deployment order. The sections below record the initial audit checkpoint.

## Assessment

**The tested local flows pass after repairs. This is not a certification that the application has no vulnerabilities or that every production/device combination works.** The review found exploitable authorization problems and several broken user flows; the fixes and repeatable evidence are below. Production acceptance remains conditional on the limitations in the final section.

The review covered the React client, Express endpoints, Socket.IO events, room/participant persistence, ballot validation and Schulze calculation, feedback, browser storage, PWA code, deployment configuration, and installed dependency advisories. Retesting used an isolated local PostgreSQL database and temporary local application servers. No application deployment or migration to the configured hosted database was performed.

## Verification results

| Check | Result | Evidence |
| --- | --- | --- |
| Server tests, including REST and real Socket.IO traffic against PostgreSQL | **46 passed; 0 failed; 0 skipped** | [Server results](security-audit-2026-10-26/server-tests.txt) |
| Client gesture utility tests | **3 passed; 0 failed** | [Client results](security-audit-2026-10-26/client-tests.txt) |
| Browser scenarios in isolated mobile and desktop contexts | **10 checks passed** | [Browser results](security-audit-2026-10-26/browser-results.json) |
| Unhandled browser JavaScript exceptions | **0** during the browser scenarios | Same browser results |
| Production client build | **Passed** | [Build output](security-audit-2026-10-26/client-build.txt) |
| Client lint | Completed with **73 warnings**, no reported errors; not warning-clean | [Lint output](security-audit-2026-10-26/client-lint.txt) |
| Current npm dependency advisory checks | **0 known vulnerabilities** in client and server dependency trees | [Dependency results](security-audit-2026-10-26/dependency-audit.json) |
| Pattern scan of tracked files | No matches for the checked private-key, AWS-key, OpenAI-key, and remote database-credential patterns | Heuristic scan only; not a complete secret-history audit |
| Patch whitespace validation | Passed | `git diff --check` |

Browser testing used Chromium with a 393 × 852 mobile viewport and a separate 1280 × 900 desktop browser context. It exercised real frontend controls, server calls, sockets, and database writes. The mobile context is emulation, not a physical phone.

## Security findings repaired

Severity describes the original issue in the reviewed code, not an assertion that it remains exploitable after the fix.

| Severity | Original issue and impact | Repair and verification |
| --- | --- | --- |
| Critical | Host checks trusted public participant IDs, device claims, or host flags from another room. A guest could impersonate a host or act across rooms. | Socket privileges now depend on authenticated membership and the current server-owned host record for the requested room. Tests cover forged host joins, guest starts, cross-room actions, departed-host revocation, and host migration. |
| High | A client could name another participant when submitting ballots, changing budgets, leaving, or manipulating room events. REST fallbacks could silently attribute a request to the first participant. | Exact participant/private-device ownership is required. Removed the first-participant fallback and arbitrary participant creation from vote/feedback mutations. Tests cover both REST and socket impersonation. |
| High | Public responses and some socket broadcasts exposed device identifiers and private budget amounts. Device IDs were derived from predictable browser fingerprints. | Public participant serialization omits credentials and budget amounts. New device credentials use cryptographic randomness. Legacy fingerprint credentials rotate on upgrade. Webhook payloads no longer include device credentials. |
| High | A PIN collision could delete an existing database room before retrying creation. Room creation also reported success before durable persistence completed. | Room, host, and initial options are created atomically. PIN collisions retry allocation without deleting existing rooms. The collision regression confirms the original room and host survive. |
| High | Unauthenticated finalize/expansion operations and permissive feedback fallback behavior could alter shared state or analytics. | Host authorization covers administrative room operations. Feedback requires the matching participant credential, a known option in the room, completed voting, and integer ratings from 1–5. |
| High | Socket CORS configuration alone did not block disallowed-origin WebSocket handshakes. | The handshake now applies the origin check through `allowRequest`. A real client with an attacker origin is rejected. |
| High | Rate limits could be bypassed by changing a caller-controlled device ID. Several expensive lookup endpoints lacked limits, and socket events had no message budget. | HTTP rate budgets use IP identity; lookup routes and the API have limits. Sockets have a message budget and room rosters are capped. Tests confirm rotating IDs cannot reset the HTTP budget. Distributed limits and capacity still require deployment validation. |
| High | A production administrator route could permit loopback requests without a configured admin key. Unconditional proxy trust also weakened IP-based controls. | Production administration fails closed without `ADMIN_API_KEY`; proxy trust is explicit through `TRUST_PROXY`. Tests cover production denial with forged forwarding headers. |
| High | Installed request-parser and Vite versions had published advisories. | Updated the lockfiles to patched compatible releases: **body-parser 2.4.0** and **Vite 8.3.5**. Both final npm advisory checks report zero known vulnerabilities. |
| Medium | Any anonymous venue report immediately hid matching venues for every user. | Reports are pending review rather than global closure decisions. Only explicitly approved reports affect the server exclusion set. The reporter can still hide the venue locally. Pending reports are deduplicated and bounded. There is no new moderation dashboard. |
| Medium | Frontend CSP allowed inline scripts; the production connection policy omitted the first-party WebSocket scheme. | Moved theme initialization to a same-origin file, removed `unsafe-inline` from `script-src`, added object/base/frame/form restrictions and first-party WSS origins. The service worker cache version was advanced. Live-host header delivery remains unverified. |

New authorization and race-condition regressions are in [securityFlows.test.js](../server/src/securityFlows.test.js). Shared checks are in [roomSecurity.js](../server/src/utils/roomSecurity.js), and REST/socket ballot writes share [ballotSubmission.js](../server/src/utils/ballotSubmission.js).

## Functional issues repaired

- **Invites:** `/j/:pin` was routed to a page that only read `?pin=...`. Both forms now prefill the join code, and the user can enter a name before joining.
- **Creation and starting:** a room is published after persistence succeeds. The host enters voting after the server confirms the snapshot. Empty decks, duplicate option IDs, and repeated/concurrent starts are rejected.
- **Budgets:** the voting snapshot applies the group's stored price caps. Selecting All clears the previous stored restriction. Individual budget amounts stay private.
- **Ballot delivery:** socket and REST submissions share one immutable durable ballot, including simultaneous retries. The client retries unanswered submissions and restores state after reconnection. A REST fallback can complete the same shared session.
- **Results:** removed the disconnected/solo timers and query-string shortcuts that could display a locally invented result. Live results wait for server confirmation. Archived results can still be opened from saved history.
- **Reloads:** fresh deck loads were missing event listeners because they mounted before the socket existed. Listener registration now follows connection readiness. Result recovery includes support, status, veto flags, and tie information.
- **Persistence:** voting status and selected options are persisted. Completed results can be reconstructed from durable ballots after session caches are lost, including custom-option winners. This does not fully persist an in-progress room snapshot; see limitations.
- **Room membership:** page refresh no longer sends an explicit leave. Host transfer is based on server-owned roster state. Removal is idempotent and revokes the removed member's eligibility. Late entrants receive an error instead of an unfinishable voting deck.
- **Rematches:** the host selects the next ranked alternative for all participants. Previously, the client restarted only its own deck. Result support is recomputed for the alternative, and its selected ID is persisted.
- **Honest statistics:** zero approval stays zero instead of becoming a fabricated 76–98% match. Pairwise ties are not counted as wins. Result wording distinguishes tied selections, weak support, and fallback picks; absent head-to-head data is not filled with invented 1–0 results.
- **Feedback:** failed submissions stay editable and no longer claim success. A successful retry is verified in the browser and persists feedback in PostgreSQL. History stores the winner identifier needed for subsequent feedback.
- **Other utility fixes:** custom-poll actions display translated button text instead of the raw `startRoom` key. The API resolver supports the documented environment variable. Browser zoom is enabled.

## Browser evidence

The browser suite exercised creation, theme switching, invite prefill, two-person rosters, guest restrictions, host refresh, candidate addition, details, pause/resume, all-card voting, the waiting quorum, matching results, result refresh, failed/successful reviews, shared rematches, saved history, reopening an archived winner, and a solo custom poll.

- [Discovery lobby](security-audit-2026-10-26/discovery-lobby-mobile.png)
- [Voting card](security-audit-2026-10-26/discovery-voting-mobile.png)
- [Discovery result](security-audit-2026-10-26/discovery-winner-mobile.png)
- [Custom-poll result](security-audit-2026-10-26/custom-winner-mobile.png)

The repeatable browser script is [security-browser-test.cjs](../scripts/security-browser-test.cjs). It refuses non-local app URLs and exits unsuccessfully on failed assertions.

## Remaining limits and release requirements

1. **In-progress restart recovery is incomplete.** Rosters, custom suggestions before voting, the selected live deck, removal records, and quorum state still rely on process memory. Completed results are recoverable; an interrupted unfinished room can require a new pick. Persist the full session snapshot before claiming reliable recovery through backend restarts.
2. **Multiple backend instances and claimed scale were not validated.** Room state, locks, and limits are process-local. This audit does not substantiate the existing 1,000+ concurrent-user claims. Shared state/coordination, appropriate socket routing, and representative load testing are required for a multi-instance release.
3. **Production configuration was reviewed as files, not tested on the live host.** Verify TLS, actual proxy ranges, runtime secrets, CORS, CSP and cache headers, WebSocket upgrades, database access controls, retention, and backup/restore on the deployment. Set a stable random `HOST_TOKEN_SECRET`, configure `ADMIN_API_KEY` if system operations are needed, and trust only the actual proxy ranges. Do not expose development servers publicly.
4. **Four-digit PINs are convenient invitations, not strong room secrecy.** An anonymous person who discovers a valid PIN can attempt to join. Use high-entropy invitations or an approval step if rooms will contain sensitive information. Random private device credentials protect participant/host actions; they do not prevent a person from creating another anonymous identity.
5. **Native platform and external-service behavior remain unverified.** Physical iPhone/Safari, Android, installation, native sharing, clipboard permissions, real GPS, and third-party map/photo/menu availability need device checks. Venue hours, prices, ratings, photographs, and curated fallbacks are not independently verified business facts. Paid-provider credentials, outages and quotas were not comprehensively exercised.
6. **Background reminders are best effort.** The service worker uses a timer; browsers may suspend it. A guaranteed delayed notification needs an appropriate durable scheduling/push mechanism. The saved return-to-app reminder is a separate fallback.
7. **Static warnings remain.** The 73 lint warnings include effect/dependency concerns, duplicate translation keys, and unused values. The production build also warns about a large main bundle. They do not fail the tested scenarios, but they should not be represented as a clean static-analysis result. Exhaustive accessibility and localization testing was not performed.
8. **Credential rotation affects old sessions.** Predictable legacy device fingerprints are replaced by random credentials. Old rooms tied to those fingerprints may need to be recreated; saved history remains local. Store loss/private-mode restrictions can also prevent anonymous identity recovery.

## Reproducing the checks

Use a disposable **local** PostgreSQL database with a name containing `test`; initialize it from `server/prisma/schema.prisma`. The test bootstrap overrides the normal database URL, disables external activity webhooks, and rejects non-local test databases.

```sh
TEST_DATABASE_URL="$LOCAL_AUDIT_DATABASE_URL" npm --prefix server test
node --test client/src/components/ui/drawerMotion.test.js
npm --prefix client run lint
npm --prefix client run build
npm --prefix server audit
npm --prefix client audit
```

Run the browser script against local servers configured for that same disposable database. Provide `AUDIT_APP_URL`, an installed Playwright module through `PLAYWRIGHT_MODULE` if necessary, and `CHROMIUM_EXECUTABLE` if using an existing Chromium installation. No live service or production data is needed for the checked core flows.

## Reference material

- [Attached system and UX dossier](</Users/seb/Desktop/CONSENSUS_ENGINE_COMPLETE....pdf>)
- [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Socket.IO origin and WebSocket restrictions](https://socket.io/docs/v4/handling-cors/)
- [Request-parser advisory](https://github.com/advisories/GHSA-27r3-jxmh-p828)
- [Vite development-server advisory](https://github.com/advisories/GHSA-587h-7wmj-h5pm)
