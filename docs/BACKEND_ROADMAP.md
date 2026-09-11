# Backend Team (Team 2) - 4-Sprint Roadmap

Hey Afina, Max, and Lilia! 

To keep everyone moving fast, we are using a **Contract-Driven** architecture. You do not need to ask the Frontend team how the UI works—just build your API endpoints to output the exact JSON formats listed in [`API_CONTRACT.md`](./API_CONTRACT.md). 

Here is your exact timeline for the entire semester.

---

## 🛠️ Sprint 1: Architecture & Prototyping
**Goal:** Get the database running and the basic REST API working.
*   **Afina (Database Master):** Open `DATABASE_SCHEMA.md` and copy the models into `server/prisma/schema.prisma`. Run `npx prisma db push` to create the Postgres tables. Write simple helper functions (e.g., `createUser()`).
*   **Max (API Architect):** Build the basic Express server. Create the `POST /api/v1/rooms` endpoint. Don't worry about Google Places yet—just successfully create a room and save it to Afina's database.
*   **Lilia (Real-Time Engineer):** Install Socket.io. Just get it to log "A user connected" when a browser connects. 

---

## 🔌 Sprint 2: APIs & "Step Zero"
**Goal:** Connect to the outside world and filter data.
*   **Max:** Hook up the **Google Places API** to the room creation endpoint. When a room is made, the server should fetch 15 restaurants and save them to the DB.
*   **Afina:** Build the Levenshtein Distance algorithm. When users submit custom ideas, run the math to automatically merge duplicates before saving them to the database.
*   **Lilia:** Build the "Step Zero" pruning logic. When users submit their budgets, filter the database to delete restaurants that are too expensive.

---

## ⚡ Sprint 3: Real-Time Engine & Algorithm
**Goal:** Make it multiplayer and do the complex math.
*   **Lilia:** Build the Socket.io "Rooms". Ensure that when someone joins PIN "4921", their Socket only talks to other people in "4921". Broadcast live updates (e.g., "3/5 users voted").
*   **Team Effort (The Algorithm):** When all votes are in, execute the **Schulze Method / Condorcet Algorithm**. Convert the rankings into a 2D matrix, find the winner, and save the result to the database.

---

## 🚀 Sprint 4: Polish, Testing & Deployment
**Goal:** Make it crash-proof and put it on the internet.
*   **Afina:** Build the "Post-Event Feedback Loop". Create an endpoint that accepts a 1-5 star review and updates our proprietary `Venue_Analytics` table.
*   **Max:** Offload the Sprint 3 Graph Algorithm onto a `worker_thread` so it doesn't freeze the main Express Event Loop.
*   **Lilia:** Deploy the Node.js server to the internet using **Render** or **Railway.app**. Ensure CORS policies allow the frontend to connect securely.
