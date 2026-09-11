# The Consensus Engine

A real-time Progressive Web App (PWA) designed to solve group decision paralysis using Graph-Theory mathematics and frictionless UX.

---

## 👥 Team Members
*   **Team 1 (Frontend & UX):** Seb, Gabi
*   **Team 2 (Backend, Data, & DevOps):** Afina, Max, Lilia

---

## 📖 Documentation Overview
This repository utilizes **Contract-Driven Development**. This means Team 1 (Frontend) doesn't have to wait for Team 2 (Backend) to finish! Team 1 can look at the JSON examples in the Docs and start building the UI immediately.

Please read the documentation in the `/docs` folder before writing code:
0. [DAY 0: Absolute Beginner Setup](./docs/DAY_0_SETUP.md) *(READ THIS FIRST)*
1. [Beginner's Git Guide](./CONTRIBUTING.md) *(How to safely save code)*
2. [Team 1: Frontend Roadmap](./docs/FRONTEND_ROADMAP.md) *(Seb & Gabi's Timeline)*
3. [Team 2: Backend Roadmap](./docs/BACKEND_ROADMAP.md) *(Afina, Max, Lilia's Timeline)*
4. [System Architecture](./docs/ARCHITECTURE.md) *(How the whole app works)*
5. [REST API Contract](./docs/API_CONTRACT.md) *(The JSON formats for Frontend <-> Backend)*
6. [Socket.io Events](./docs/SOCKET_EVENTS.md) *(Real-time multiplayer events)*
7. [Prisma Database Schema](./docs/DATABASE_SCHEMA.md) *(The PostgreSQL tables)*
8. [Deployment Strategy](./docs/DEPLOYMENT.md) *(Vercel & Render DevOps guide)*

---

## 💻 Tech Stack
*   **Frontend:** React (Vite), Tailwind CSS
*   **Backend:** Node.js, Express, Socket.io
*   **Database:** PostgreSQL, Prisma ORM
*   **APIs:** Google Places API

---

## 📂 Proposed Folder Structure
To keep Team 1 and Team 2 from stepping on each other's toes, we will use a "Monorepo" structure. Everything lives in this one Git repository, but it's split into two main folders:

```text
consensus-engine/
├── client/           # Team 1 (Seb & Gabi) works strictly in here (React/Vite)
├── server/           # Team 2 (Afina, Max, Lilia) works strictly in here (Node/Express)
├── docs/             # Architecture and API contracts
├── README.md
└── CONTRIBUTING.md
```

## 🛠️ First Time Setup (How to run the project)
*(Note: We will update this section once the `client` and `server` folders are officially created in Sprint 1).*

**Prerequisites:**
You must install [Node.js](https://nodejs.org/) and [Git](https://git-scm.com/) on your computer.

**To run the Frontend (Seb & Gabi):**
```bash
cd client
npm install
npm run dev
```

**To run the Backend (Afina, Max, Lilia):**
```bash
cd server
npm install
npx prisma generate
npm run dev
```