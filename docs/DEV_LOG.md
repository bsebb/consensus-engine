# Developer Log (Changelog)

This document tracks a high-level summary of work completed each day.

## Format Guidelines
- Add the newest entries to the top.
- Keep bullet points concise and focused on *what* was accomplished or *what features* were built.
- Do not list every single file changed, just the high-level impact.

---

### September 11, 2026
* **Dark Mode Transition Lock:** Fixed a jarring UI desync where elements updated at different speeds during Light/Dark mode toggles. Implemented a temporary `theme-switching` transition lock.
* **Dual-Loop Settings UI:** Finished the "Host Settings" interactive UI that switches between Discovery (API) and Custom (Group) loop modes.
* **Wait State & Skip Voting:** Removed the hardcoded timeout after swiping the last card. Swipers now sit in a "Waiting for group" state with an animated progress bar. Added a "Vote to Skip / Finish Early" button.
* **Local History Feature:** Shipped a new "Past Decisions" feature that leverages `localStorage` to save decision outcomes without requiring user accounts. Added the History icon to the Join Room screen.
* **Button Hover Responsiveness & Touch Target Audit:** Eliminated sluggish button hover delays by upgrading micro-interactions to `transition-colors duration-100` and scoping theme transition locks away from initial render. Upgraded the Past Decisions button to a full Apple HIG 44×44pt touch target with `lucide-react`'s official `Clock` icon.
* **Frontend Audit:** The browser agent completely audited the prototype UI. No console errors or rendering crashes found during stress testing.
