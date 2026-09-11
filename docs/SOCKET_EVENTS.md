# Socket.io Event Dictionary

This document outlines the real-time events handled by the WebSocket engine. **No voting data is transmitted via sockets** to reduce payload size; sockets are exclusively for Room State synchronization.

## 1. Client Emits (React -> Node)

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `join_lobby` | `{ pin: "4921", participant_id: "uuid" }` | Client attempts to join a specific room namespace. |
| `host_lock_lobby` | `{ pin: "4921", host_id: "uuid" }` | The Host closes the lobby to new participants. |
| `host_start_voting` | `{ pin: "4921", host_id: "uuid" }` | The Host finishes Step Zero and triggers the swiping phase. The backend auto-merges custom suggestions here. |
| `notify_votes_submitted` | `{ pin: "4921" }` | Fired immediately after the REST `POST /votes` succeeds to update the room counter. |
| `host_force_resolve` | `{ pin: "4921", host_id: "uuid" }` | The Host manually triggers vote resolution if a participant goes AFK. |

---

## 2. Server Broadcasts (Node -> React)

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `participant_joined` | `{ total_participants: 4 }` | Updates the Host's waiting room counter. |
| `lobby_locked` | `null` | Tells all clients to transition from "Waiting" to "Step Zero / Suggestion Phase". |
| `voting_started` | `{ options: [{ id: "uuid", name: "Pizza", price: 2 }] }` | Distributes the final, sanitized list of options to all clients. UI transitions to Swipe Deck. |
| `vote_status_update` | `{ votes_received: 3, total_participants: 5 }` | Live progress bar update for everyone in the room. |
| `winner_announced` | `{ winning_option: { id: "uuid", name: "Pizza" } }` | The Graph algorithm finished running. UI shows the dramatic Consensus Reached screen. |
| `state_restore` | `{ phase: "VOTING", options_left: [...] }` | Sent to a specific client if they reconnect after a network drop, restoring their exact position. |
