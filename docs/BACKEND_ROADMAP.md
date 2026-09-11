# Backend Team (Team 2) - Getting Started Guide

Hey Afina, Max, and Lilia! 

To keep everyone moving fast without constantly waiting on each other, we have established a **Contract-Driven** architecture. Seb and Gabi are already building the React Frontend using dummy data. 

Your goal is to build the Node.js/Express server to eventually replace that dummy data. You don't need to ask Team 1 how the UI works—just build the endpoints to match the exact JSON formats listed in [`API_CONTRACT.md`](./API_CONTRACT.md).

Here is your exact roadmap for the next two sprints.

---

## 🚀 Step 1: Initial Setup
1. Read the [`CONTRIBUTING.md`](../CONTRIBUTING.md) file so you understand how we are using Git.
2. In your terminal, navigate to the `server` folder and run `npm install`.
3. Create a `.env` file inside the `server` folder. (Do not worry, this is git-ignored).
4. Add your database URL and Google Places API Key to the `.env` file.

---

## 🛠️ Step 2: Sprint 1 Tasks (Divide & Conquer)

You have 3 core domains to build first. I recommend assigning one person to each:

### 1. The Database Master (Prisma)
*   **Goal:** Set up the Postgres connection and Prisma schema.
*   **Action:** Open [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) and copy the exact models into your `server/prisma/schema.prisma` file.
*   **Action:** Run `npx prisma db push` to generate the tables.
*   **Action:** Build simple helper functions (e.g., `createRoom()`, `saveVote()`) that the REST API can call.

### 2. The API Architect (Express & Google Places)
*   **Goal:** Build the HTTP REST endpoints.
*   **Action:** Open [`API_CONTRACT.md`](./API_CONTRACT.md) and look at the routes.
*   **Action:** Build `POST /api/v1/rooms`. When "Discovery Mode" is triggered, this endpoint needs to call the **Google Places API** to fetch 15 restaurants and save them to the Prisma database using the Database Master's helper functions.
*   **Action:** Build the `POST /api/v1/rooms/:pin/suggestions` endpoint with the **Levenshtein Distance** logic to prevent duplicates.

### 3. The Real-Time Engineer (Socket.io)
*   **Goal:** Set up the live multiplayer rooms.
*   **Action:** Open [`SOCKET_EVENTS.md`](./SOCKET_EVENTS.md).
*   **Action:** Initialize `socket.io` on top of the Express server.
*   **Action:** Build the logic for `join_lobby`. When a user connects, add them to a specific Socket.io Room using their PIN so we don't broadcast votes to the wrong group.

---

## 🧠 Step 3: Sprint 2 (The Graph Theory Algorithm)
Once the database saves votes correctly and the Sockets can broadcast messages, you all will collaborate on the hardest part: **The Algorithm**.

When the final vote is submitted, you need to execute the **Schulze Method / Condorcet Algorithm**.
1. Retrieve all the votes for the room from Prisma.
2. Convert the rankings into a 2D matrix (Weighted Directed Graph).
3. Find the strongest path.
4. Emit the `winner_announced` Socket event to the frontend.

*Pro-tip: Try to run this algorithm on a Node.js `worker_thread` so it doesn't freeze the server!*

---

## 🤝 How to work with Team 1 (Seb & Gabi)
If you build your API endpoints so that they receive and return the exact JSON structures written in the `API_CONTRACT.md`, the frontend will connect to your backend flawlessly on the first try. If you realize you *need* to change the JSON structure, let Seb know so he can update the React code!
