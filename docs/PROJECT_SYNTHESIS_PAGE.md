# THE REAL-TIME CONSENSUS ENGINE
## Executive Project Synthesis Sheet (Fișă de Sinteză Executivă)

```
========================================================================================================
 PROJECT METADATA & INSTITUTIONAL CONTEXT
========================================================================================================
 Project Name      : The Real-Time Consensus Engine (PBL Technology Project)
 Repository        : github.com/seb-bahna/consensus-engine (Tagged: v1.0.0 Production Release)
 Institution       : Technical University of Moldova (TUM) | Faculty of Computers, Informatics & Microelectronics
 Study Programme   : Software Engineering (FAF-253, English Section) | Academic Year: 2026-2027
 Internship Host   : S.R.L. EVANTAGE-SOFT (Software Engineering Division, bd. Moscova 11/8, Chișinău)
 Company Mentor    : Alexandru Andruh (Programator / Senior Software Engineer)
 University Mentor : Elena Gogoi (univ.lect., PhD)
 Internship Period : 01.09.2026 - 17.10.2026 (7 Weeks / 210 Hours)
========================================================================================================
```

---

### 1. The Core Problem vs. The Engineered Solution

| Traditional Group Decision Breakdowns | The Consensus Engine Solution |
| :--- | :--- |
| **Social Indifference ("I don't care, you pick")**: Peer pressure causes participants to hide preferences to avoid blame. | **Blind Simultaneous Swiping**: Independent private voting without live ballot counters prevents social conformity bias. |
| **Early-Vote Anchoring (Chat Poll Bias)**: The first option with 2 votes rapidly snowball-wins in Telegram/WhatsApp polls. | **Condorcet/Schulze Matrix Resolution**: Graph-theory beatpath analysis detects true collective preference, not first-voter momentum. |
| **Tyranny of the Majority**: 51% majority picks a venue unacceptable (allergies, extreme prices) to the remaining 49%. | **The Explicit VETO (-100 Weight)**: Any single member can instantly eliminate a dealbreaker venue from the candidate set. |
| **Financial Embarrassment**: Friends are hesitant to admit they cannot afford a 400 MDL restaurant in front of peers. | **Step Zero Confidential Pruning**: Private spending ceilings are intersected ($\min(B)$); out-of-budget venues vanish silently. |
| **App Store Download Friction**: 50MB app store downloads and mandatory account logins cause 100% drop-off at dinner tables. | **Zero-Install Domain-Native PWA**: Instant 4-digit PIN / QR ingress on any browser in sub-3 seconds without an account. |

---

### 2. Team Specialization & Workload Distribution Matrix

```
========================================================================================================
 TEAM 1: FRONTEND ARCHITECTURE & UI/UX
========================================================================================================
 Bahnă Sebastian (Lead Architect & Team Leader) | Contract: FCIM-25-016-PR-1 | Eval: 10x Exc, 1x VG
 - Monorepo architecture, Vite 8 PWA configuration, Service Worker cache-first offline infrastructure.
 - Unified pointer capture gesture engine (3-way swipe mechanics: Approve, Pass, VETO).
 - SocketContext singleton lifecycle, reconnection state restoration, client-side Condorcet fallback.

 Oarza Gabriel (Frontend UI/UX Engineer)         | Contract: FCIM-25-016-PR-2 | Eval: 10x Exc, 1x VG
 - Apple Material HIG tokens, dual-layer surface physics (Liquid Glass header, Acrylic content cards).
 - Kowalski spring bezier transitions (cubic-bezier(0.16, 1, 0.3, 1)), 60-120 FPS GPU compositing.
 - Accessible UI controls: SegmentedControl, SpringToggle, ReviewModal, Step Zero budget slider.

========================================================================================================
 TEAM 2: BACKEND CONCURRENCY & ALGORITHMIC SYSTEMS
========================================================================================================
 Fahed Maxim (Backend Software Engineer)         | Contract: FCIM-25-72413-PR-1 | Eval: 9x Exc, 2x VG
 - Express 5 REST API endpoints (/api/v1/rooms), Google Places API integration, option hydration.
 - Room lifecycle management, input validation schemas, database seed scripts.

 Martîn Lilia (Backend Filtering & Sockets)      | Contract: FCIM-25-243-PR-1   | Eval: 10x Exc, 1x VG
 - Real-time Socket.io 4 room orchestration, 30s disconnect grace period, peer presence roll-call.
 - Step Zero constraint propagation engine, automated price-ceiling database pruning.

 Dolinskaia Afina (Algorithm & Analytics Lead)   | Contract: FCIM-25-139-PR-1   | Eval: 11x Exc
 - Schulze Condorcet Beatpath voting algorithm (Floyd-Warshall variant, O(C^3)) in worker_threads.
 - Levenshtein distance fuzzy deduplication engine (O(N*M)) for custom user submissions.
 - Prisma ORM 5 relational transactions, PostgreSQL schema design, venue true-price analytics.
========================================================================================================
```

---

### 3. High-Level System Architecture & Event Flow

```
  +-------------------------------------------------------------------------------------------------+
  | CLIENT LAYER (React 19 + Vite 8 + Tailwind v4 + Apple HIG Tokens + Service Worker PWA)          |
  | [Join / PIN Ingress] ----> [Lobby & Step Zero] ----> [Swipe Arena (Approve/Pass/VETO)] ----> [Result]  |
  +-------------------------------------------------------------------------------------------------+
                 |                                                        ^
     HTTP REST   | POST /api/v1/rooms                                     | WebSocket Events
     JSON APIs   | GET  /api/v1/rooms/:pin                                | (room_joined, quorum_update,
                 v                                                        |  winner_announced)
  +-------------------------------------------------------------------------------------------------+
  | SERVER LAYER (Node.js + Express 5 + Socket.io 4 + Grace-Period Disconnect Manager)              |
  | - REST Room Controller (/api/v1/rooms)         - Step Zero Budget Constraint Evaluator          |
  | - Socket.io Room Orchestration (PIN Isolation) - Levenshtein Fuzzy Deduplicator (O(N*M))        |
  +-------------------------------------------------------------------------------------------------+
            |                                                      |
            | Offloaded Async Task (worker_threads)                | Relational ACID Queries
            v                                                      v
  +---------------------------------------+      +--------------------------------------------------+
  | WORKER THREAD LAYER                   |      | DATA LAYER (Prisma ORM 5 + PostgreSQL)           |
  | - Schulze Beatpath Algorithm          |      | - rooms, participants, options                   |
  | - Pairwise Margin Matrix: d[i, j]     |      | - votes, ballots, venue_analytics, feedbacks     |
  | - Floyd-Warshall Variant: O(C^3)      |      | - True-Price historical accuracy scores          |
  +---------------------------------------+      +--------------------------------------------------+
```

---

### 4. Key Quantitative Metrics & Performance Benchmarks

| Metric Category | Target SLA / Industry Baseline | Consensus Engine Result | Verification Method |
| :--- | :--- | :--- | :--- |
| **First Contentful Paint (FCP)** | < 1.8 seconds (Google CWV) | **0.42 seconds** | Chrome DevTools Lighthouse Audit |
| **Client Bundle Size** | < 1.5 MB (Average WebApp) | **388 KB (117 KB gzipped)** | Vite Rollup Production Bundle Inspector |
| **Gesture Animation Rate** | 60 FPS constant | **60 - 120 FPS (Hardware ProMotion)** | Chrome Performance Trace (translate3d) |
| **DOM Layout Shifts (CLS)** | < 0.10 (WCAG / CWV) | **0.000 (Zero Layout Reflow)** | GPU Layer Paint Inspection |
| **Schulze Resolution Latency** | < 250 ms for 20 candidates | **18 ms (8 voters, 12 venues)** | Node.js `process.hrtime.bigint()` worker |
| **Socket Reconnect Recovery** | Immediate / Uninterrupted | **< 30s Grace Period (State Restored)** | Multi-Client Sleep/Wake Testing |
| **Offline Fallback Execution** | Instant without crash | **100% Client-side Condorcet fallback** | Service Worker Offline Simulation |
| **Accessibility & Design Score** | >= 90 / 100 | **100 / 100 (Automated UI/UX Audit)** | Automated a11y & Contrast Validator |

---

### 5. 7-Week Agile Delivery Roadmap

```
[Week I]   01.09 - 04.09 : Domain Analysis & Technical Inception (SRS, User Personas, Stack Selection)
[Week II]  07.09 - 11.09 : UI Wireframes, Prisma Relational Schema & Levenshtein Algorithm Engine
[Week III] 14.09 - 18.09 : Real-Time Socket.io Room Lifecycle, Multi-User Presence & Roll-Call Roster
[Week IV]  21.09 - 25.09 : PWA Standalone Manifest, Service Worker Caching & Offline Condorcet Engine
[Week V]   28.09 - 02.10 : Cross-Team Convergence, Schulze Worker-Threads Offload & 100/100 Design Audit
[Week VI]  05.10 - 09.10 : Presentation Dossier, 16-Slide Visual Deck & Live Academic Defense
[Week VII] 12.10 - 16.10 : Technical Report Synthesis, GitHub v1.0.0 Tagging & Company Mentor Sign-Off
```

---

### 6. Mathematical Guarantees & Voting Invariants

1. **Condorcet Winner Criterion**: If there is a candidate venue $X$ that beats every other candidate in pairwise head-to-head comparisons, $X$ is guaranteed to be declared the winner.
2. **Independence of Clones**: Adding duplicate or very similar venues (e.g. two branches of the same coffee shop) does not split votes or alter the victory probability of non-clone options.
3. **Reversal Symmetry**: If all voters reverse their individual preference orderings, the original unique winner cannot remain the winner.
4. **Pareto Efficiency**: If every single voter strictly prefers option $A$ over option $B$, option $B$ can never be declared the winner under any circumstance.
5. **Confidentiality Invariant**: Individual budgets $b_i$ and raw individual card swipes are never broadcast across WebSockets; only anonymized quorum status and final matrix results are published.

---

### 7. Evaluation & Institutional Sign-Off Summary

- **Company Mentor Verdict (Alexandru Andruh, EVANTAGE-SOFT)**: Approved with Distinction. Team demonstrated industry-grade architecture, rigorous concurrency management, and professional delivery. Overall team rating: 9.7 - 9.9.
- **University Mentor Verdict (Dr. Elena Gogoi, TUM FCIM)**: Final deliverables meet all 13 Technological Internship syllabus requirements. Completed 16-page logbooks, technical dossiers, and repository archives verified.
