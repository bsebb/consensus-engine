# System Architecture

## 1. High-Level Overview
The Consensus Engine is a real-time Progressive Web App (PWA) designed to solve group decision paralysis. It utilizes a **Full-Stack JavaScript** ecosystem to minimize context-switching across the 5-person team.

*   **Frontend (Client):** React, Vite, Tailwind CSS. Handles UI, local swipe state, and Socket.io client connections.
*   **Backend (Server):** Node.js, Express, Socket.io. Manages transient room state, REST API endpoints, and CPU-intensive mathematical operations.
*   **Database (Data Tier):** PostgreSQL, Prisma ORM. Ensures strict ACID compliance, data type safety, and stores long-term feedback analytics.

## 2. Option Generation (The Dual-Loop Flow)
Rooms can be populated with voting options via two distinct paths:

### Loop A: Discovery Mode (API-Driven)
*   **Use Case:** Finding a restaurant, cafe, or bar.
*   **Flow:** The host selects a Theme, Radius, and Budget. The backend queries the **Google Places API** to fetch 10-15 venues.
*   **API Caching (Cost Protection):** To prevent draining API credits, the backend caches the Google Places JSON response. If another room requests the same latitude/longitude/radius within 24 hours, the server serves the cached data instead of pinging Google.
*   **Step Zero (The Prune):** Before voting, participants anonymously submit a strict budget cap. The backend cross-references this with the Google API data and our proprietary `Venue_Analytics` table, pruning any options that exceed the group's limits.

### Loop B: Custom Mode (User-Driven)
*   **Use Case:** Custom activities (e.g., "John's Apartment", "Board Games").
*   **Flow:** Participants get 60 seconds to submit anonymous strings.
*   **Sanitization:** The backend runs a **Levenshtein Distance** algorithm to calculate fuzzy string similarity. Similar inputs (e.g., "John's House" and "Johns House") are automatically merged into a single database Node to prevent vote-splitting.
*   **Host Curation:** The Host performs a final manual approval of the merged list before voting begins.

## 3. The Core Engine (Real-Time & Math)
*   **Socket.io Event Loop:** Swiping happens locally on the React client. Votes are *batched* and sent via a single REST payload to prevent hammering the Socket server. Socket.io is strictly used for lightweight Room State synchronization (e.g., "3/5 Users finished").
*   **The Consensus Algorithm:** Group preferences are modeled as a **Weighted Directed Graph**. Using the Schulze Method (or similar Condorcet algorithm), the backend calculates the strongest path to find the option that minimizes overall group dissatisfaction. 
*   **Concurrency:** To prevent the CPU-heavy graph matrix calculations from blocking the Node.js Event Loop, the algorithm runs on a separate `worker_thread` when triggered.

## 4. Post-Event Feedback Loop (Data Engineering)
After a room resolves, the app prompts users to review the winning option (e.g., "Did this actually match the expected budget?"). This data is aggregated into the `Venue_Analytics` table, allowing the Consensus Engine to slowly build a proprietary dataset that overrides inaccurate Google Places pricing data.
