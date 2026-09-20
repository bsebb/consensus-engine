# Backend Rules (Server Scope)

These rules apply whenever viewing, editing, or creating files in `/server`.

## 1. Socket.io Room Isolation & Real-Time Sync
*   **Namespace / Room Scoping:** Every Socket.io event must be scoped to its specific room `pin` using `socket.to(pin)`. Never broadcast voting actions globally.
*   **Zero Vote Swipes via Sockets:** Individual swipe gestures must never be emitted over WebSockets. Votes are batched locally on the client and sent in a single REST `POST /rooms/:pin/votes`. Sockets are strictly reserved for lobby counts, state synchronization, and final winner broadcast.

## 2. Event Loop Protection
*   **Heavy Compute Offload:** The Condorcet / Schulze Graph Theory algorithm must be offloaded to a Node.js `worker_thread` or asynchronous microtask to prevent freezing the Express event loop during vote resolution.

## 3. Database & Secret Safety
*   **Prisma Integrity:** Always use composite unique constraints on `[participant_id, option_id]` to prevent duplicate vote rows.
*   **Secret Guard:** Never log or return `GOOGLE_PLACES_API_KEY` or `DATABASE_URL` in HTTP responses or console output.
*   **Standardized Responses:** All REST endpoints must return standard JSON payloads. Errors must follow `{ success: false, error: "CODE", message: "..." }`.

## 4. Developer Logging
*   **Update the Changelog:** At the end of every significant task or daily work session, append a high-level summary of what you built to `docs/DEV_LOG.md`. This maintains a continuous history of the project's state.
