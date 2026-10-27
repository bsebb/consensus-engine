# Owner dashboard and single-instance recovery

27 October 2026. The private dashboard is deployed at https://noyoupick.org/dashboard, which redirects to the canonical https://www.noyoupick.org/dashboard. The backend release is `db535881434d3a5d52f3a64dfd17c36aab3b8fc0`; its confirmed replacement deployment is `dep-dbg9aut9fdbs73d5lrlg`.

## One instance is enough for restart recovery

Render remains configured for **one free instance**. No paid service or workspace upgrade was created. The user chose to keep this configuration after reviewing the two-instance option.

Room snapshots and accepted ballots live in Neon. A replacement application process reloads them. This protects unfinished sessions across a restart; it does not promise uninterrupted service while the only process is unavailable. A second instance primarily adds capacity and availability. Local two-process room recovery and dashboard-session checks passed; hosted multi-instance testing was deliberately deferred with the paid scaling option.

The final live rehearsal held an authenticated dashboard browser, a host with one local swipe, and a guest with a submitted ballot. A standard redeploy of the same code replaced Render instance `zk5lh` with `pdl4n`, with configured instance count still one. Health uptime changed from 550 seconds to 9 seconds. The exact seven-option deck and submitted ballot were unchanged in Neon. The dashboard cookie still authenticated, the host resumed the remaining cards, and host and guest reached the same result.

Two earlier test-control attempts are not counted as recovery passes. One waiting window expired while the final code was being deployed. Another received a Render restart acknowledgement/event but did not observe a reset of process uptime within its watchdog window. The successful run used a definite standard deployment, a longer coordinated test window, and checked new instance identity and uptime before releasing the browsers.

## Dashboard data and access

The dashboard shows UTC calendar periods of 7, 30 or 90 days: rooms created, recently active rooms, anonymous browser identities, room joins, completed picks, completion rate, voters, card ratings, daily activity, categories, winning choices, and feedback totals/average satisfaction.

These are aggregates over retained database records. Expired-room cleanup can remove historical records. Anonymous browser identities are not verified people, and this release does not add page-view tracking or claim a lifetime analytics ledger.

The app does not link the dashboard in its public navigation. Knowing its address grants no data access. Every analytics request requires the owner session. Only the canonical dashboard origin can make credentialed dashboard reads or mutations; sibling subdomains are rejected too. API responses are private/no-store, service workers bypass API traffic, and the dashboard is marked noindex/nofollow.

Passkeys use maintained SimpleWebAuthn libraries with user verification required. Challenges are five-minute, browser-bound and atomically consumed in PostgreSQL. The one initial-owner row is locked during enrollment, so concurrent attempts cannot register multiple owners. Only public credential material is stored. Random eight-hour sessions are stored as hashes and delivered in Secure, HttpOnly, SameSite=Strict, host-only cookies. Logout revokes the server record. Authentication attempts use shared database rate limits.

There is no public signup, password fallback, or anonymous credential reset. Owner setup requires a random, 24-hour, one-time invitation. Enrollment atomically closes setup and clears the invitation hash. Owner recovery after losing a passkey requires trusted infrastructure access.

## Your first setup

The private invitation is in `.private/dashboard-setup.md`, excluded from Git and restricted to the local user. Open its link in Safari or Chrome on your own device, choose **Create my passkey**, and confirm with your device or security key. This device interaction is the remaining user step. After enrollment, return to the ordinary `/dashboard` address to sign in.

All disposable live-test passkeys and their sessions were revoked before minting the user's invitation. Reissuing an unclaimed invitation is supported by `scripts/prepare-dashboard-access.cjs` with the intended direct `DATABASE_URL`. That helper refuses to reset an enrolled owner. Never commit the resulting private file.

## Verification

- **66 server tests** passed, with no failures or skipped tests; **3 client utility tests** passed.
- Production build and lint pass. Forty pre-existing, non-failing client lint warnings remain. No new dashboard lint warning remains.
- Client and server dependency audits reported zero known advisories.
- The dashboard migration was rehearsed on a temporary Neon branch, then applied to production through Prisma. All existing application-table checksums were unchanged, and the final schema matches Prisma. The rehearsal branch expires automatically at 15:00 UTC on 27 October.
- Real WebAuthn enrollment, passkey sign-in, date filters, refresh, desktop/mobile layout and scrolling, logout revocation, challenge replay rejection, expired invitations, and access through two local backend processes passed.
- Live enrollment, secure same-origin cookies through the frontend proxy, aggregate reads, preserved session after a confirmed server replacement, logout and sign-in passed. A disposable virtual authenticator was used; physical Face ID/Touch ID enrollment belongs to the user.
- The complete live host/guest flow passed after replacement, including invite join, roster sync, reload, candidate addition, details, pause/resume, partial-vote recovery, quorum, shared result, feedback retry, rematch, history and custom polls.
- Successful browser runs had zero unhandled page exceptions.
- Cleanup removed exactly four test-created rooms, their dependent test data, and one test contribution to venue feedback averages. It did not prune ordinary app data.

Evidence is under [dashboard-verification-2026-10-27](dashboard-verification-2026-10-27/). Screenshots committed there show synthetic local fixtures only. Live dashboard screenshots and actual aggregate counts remain in private local files, not in the repository.

[SimpleWebAuthn documentation](https://simplewebauthn.dev/docs/packages/server) · [Render scaling documentation](https://render.com/docs/scaling)
