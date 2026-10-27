# Owner dashboard and single-instance recovery

27 October 2026. The private dashboard is deployed at https://noyoupick.org/dashboard, which redirects to the canonical https://www.noyoupick.org/dashboard. The initial backend release was `db535881434d3a5d52f3a64dfd17c36aab3b8fc0`; its confirmed replacement deployment is `dep-dbg9aut9fdbs73d5lrlg`.

## One instance is enough for restart recovery

Render remains configured for **one free instance**. No paid service or workspace upgrade was created. The user chose to keep this configuration after reviewing the two-instance option.

Room snapshots and accepted ballots live in Neon. A replacement application process reloads them. This protects unfinished sessions across a restart; it does not promise uninterrupted service while the only process is unavailable. A second instance primarily adds capacity and availability. Local two-process room recovery and dashboard-session checks passed; hosted multi-instance testing was deliberately deferred with the paid scaling option.

The final live rehearsal held an authenticated dashboard browser, a host with one local swipe, and a guest with a submitted ballot. A standard redeploy of the same code replaced Render instance `zk5lh` with `pdl4n`, with configured instance count still one. Health uptime changed from 550 seconds to 9 seconds. The exact seven-option deck and submitted ballot were unchanged in Neon. The dashboard cookie still authenticated, the host resumed the remaining cards, and host and guest reached the same result.

Two earlier test-control attempts are not counted as recovery passes. One waiting window expired while the final code was being deployed. Another received a Render restart acknowledgement/event but did not observe a reset of process uptime within its watchdog window. The successful run used a definite standard deployment, a longer coordinated test window, and checked new instance identity and uptime before releasing the browsers.

## Dashboard data and access

The dashboard uses the same logo, appearance preferences, accent colors and rounded cards as the app. It has Overview, Sessions and Feedback tabs, with UTC calendar periods of 7, 30 or 90 days.

Overview covers room and ballot trends, first-seen and returning anonymous browsers, repeated visits across rooms, completion stages, average group size, creation-to-last-ballot timing, all five rating actions, category performance, winning choices and room status. Daily chart metrics are selectable and each day exposes its counts. Category and winner tables show the top 20.

Sessions supports topic/winner search, status and mode filters, and pages of 20 rooms. Opening a room shows its members, accepted ballots/quorum, candidate count, saved match score, winner, up to 100 choices with vote-action counts (including unvoted choices), and the latest 30 feedback entries. Participant identities, browser credentials, room join PINs, budgets and private snapshots are excluded.

Feedback shows review totals, average satisfaction and price accuracy, plus the latest 20 anonymous ratings/comments. Comments are rendered as escaped text, with a 500-character response limit.

These are room cohorts: totals and feedback cover rooms created in the selected period. Activity after creation belongs to that cohort. Recently active excludes completed/closed rooms and requires an update in the last 30 minutes. Older rooms without snapshots are explicitly labeled. Timing measures room creation to the last recorded ballot in completed rooms; it is not a precise result-generation timestamp.

No schema migration or infrastructure upgrade is required for the redesign. Aggregation stays in PostgreSQL, session results are bounded, queries are parameterized, and each room detail is read in a consistent database snapshot. Existing owner authentication remains enforced on every new route. A frontend guard rejects the old analytics response during independent frontend/backend rollouts and provides a working Refresh action. The browser rehearsal verifies this temporary mismatch and recovery.

These are aggregates over retained database records. Expired-room cleanup can remove historical records. Anonymous browser identities are not verified people, and this release does not add page-view tracking or claim a lifetime analytics ledger.

The app does not link the dashboard in its public navigation. Knowing its address grants no data access. Every analytics request requires the owner session. Only the canonical dashboard origin can make credentialed dashboard reads or mutations; sibling subdomains are rejected too. API responses are private/no-store, service workers bypass API traffic, and the dashboard is marked noindex/nofollow.

Passkeys use maintained SimpleWebAuthn libraries with user verification required. Challenges are five-minute, browser-bound and atomically consumed in PostgreSQL. The one initial-owner row is locked during enrollment, so concurrent attempts cannot register multiple owners. Only public credential material is stored. Random eight-hour sessions are stored as hashes and delivered in Secure, HttpOnly, SameSite=Strict, host-only cookies. Logout revokes the server record. Authentication attempts use shared database rate limits.

There is no public signup, password fallback, or anonymous credential reset. Owner setup requires a random, 24-hour, one-time invitation. Enrollment atomically closes setup and clears the invitation hash. Owner recovery after losing a passkey requires trusted infrastructure access.

## Owner access

The owner has completed passkey enrollment. The redesign preserves the existing credential and sessions; it does not reissue setup access.

For an initial, unclaimed setup only, the private invitation is in `.private/dashboard-setup.md`, excluded from Git and restricted to the local user. Open its link in Safari or Chrome on your own device, choose **Create my passkey**, and confirm with your device or security key. After enrollment, return to the ordinary `/dashboard` address to sign in.

All disposable live-test passkeys and their sessions were revoked before minting the user's invitation. Reissuing an unclaimed invitation is supported by `scripts/prepare-dashboard-access.cjs` with the intended direct `DATABASE_URL`. That helper refuses to reset an enrolled owner. Never commit the resulting private file.

## Verification

- **68 server tests** passed after the redesign, with no failures or skipped tests; **3 client utility tests** passed.
- Production build and lint pass. Forty pre-existing, non-failing client lint warnings remain. No dashboard lint warning remains.
- Client and server dependency audits reported zero known advisories.
- The dashboard migration was rehearsed on a temporary Neon branch, then applied to production through Prisma. All existing application-table checksums were unchanged, and the final schema matches Prisma. The rehearsal branch expires automatically at 15:00 UTC on 27 October.
- Real WebAuthn enrollment, passkey sign-in, date filters, refresh, desktop/mobile layout and scrolling, logout revocation, challenge replay rejection, expired invitations, and access through two local backend processes passed.
- Live enrollment, secure same-origin cookies through the frontend proxy, aggregate reads, preserved session after a confirmed server replacement, logout and sign-in passed. A disposable virtual authenticator was used; physical Face ID/Touch ID enrollment belongs to the user.
- The complete live host/guest flow passed after replacement, including invite join, roster sync, reload, candidate addition, details, pause/resume, partial-vote recovery, quorum, shared result, feedback retry, rematch, history and custom polls.
- Successful browser runs had zero unhandled page exceptions.
- Cleanup removed exactly four test-created rooms, their dependent test data, and one test contribution to venue feedback averages. It did not prune ordinary app data.

The redesign was deployed and checked through the owner’s existing signed-in browser: Overview, completed-session filtering, individual choice results and Feedback loaded correctly with retained production records. Owner passkeys and sessions were not reset. Actual live figures remain outside Git.

The expanded redesign tests cover filter validation, literal searches, pagination, score tiers, unvoted choices, feedback truncation and escaping, returning-browser counts, private-field exclusion, all room-status classifications, mobile scrolling and shared theme preferences. A local database running in a non-UTC timezone caught and verified a fix to inactivity classification. The local browser rehearsal uses only a disposable database; do not rerun live enrollment helpers after owner enrollment.

Redesign evidence is under [dashboard-redesign-2026-10-27](dashboard-redesign-2026-10-27/). Initial release evidence is under [dashboard-verification-2026-10-27](dashboard-verification-2026-10-27/). Screenshots committed there show synthetic local fixtures only. Live dashboard screenshots and actual aggregate counts remain in private local files, not in the repository.

[SimpleWebAuthn documentation](https://simplewebauthn.dev/docs/packages/server) · [Render scaling documentation](https://render.com/docs/scaling)
