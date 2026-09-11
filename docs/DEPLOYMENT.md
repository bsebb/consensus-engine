# Deployment & DevOps Strategy

To ensure a seamless, professional launch in Sprint 4, we will use a **Continuous Integration / Continuous Deployment (CI/CD)** pipeline. Nobody will manually upload files to a server. 

Because we use a Monorepo, we split our deployment across two distinct cloud providers optimized for their specific tasks.

---

## 1. Frontend (Vercel)
**Lead DevOps: Seb**
*   **Target Folder:** `/client`
*   **Tech:** React, Vite, PWA Service Workers.
*   **Why Vercel?** Vercel is built specifically for Vite/React static assets. It deploys our UI globally to Edge CDNs, ensuring users load the swipe interface in milliseconds regardless of their geographic location.
*   **Configuration:** Vercel will be configured to trigger a rebuild ONLY when changes occur inside the `/client` folder on the `main` branch.

## 2. Backend & Database (Render or Railway)
**Lead DevOps: Lilia**
*   **Target Folder:** `/server`
*   **Tech:** Node.js, Express, Socket.io, PostgreSQL.
*   **Why Render?** Unlike Serverless environments (which kill connections after 10 seconds), Render provides persistent, always-on containers. This is **mandatory** for maintaining active Socket.io WebSocket connections during the voting phase.
*   **Configuration:** Render will monitor the `/server` folder. Lilia will inject the production `DATABASE_URL` and `GOOGLE_PLACES_API_KEY` directly into the Render dashboard environment variables.

---

## 3. The CORS Whitelist (Critical Security)
Once both domains are live (e.g., `consensus-engine.vercel.app` and `api.consensus-engine.onrender.com`), the backend will completely block the frontend due to browser security rules.

**The Fix:**
Lilia must explicitly add Seb's Vercel URL to the Express CORS middleware and the Socket.io initialization configuration in the backend code:
```javascript
// Example Backend Config
const corsOptions = {
  origin: "https://consensus-engine.vercel.app", // Seb's Vercel URL
  methods: ["GET", "POST"]
};
```

## 4. CI/CD Workflow
Once configured, deployment is automatic:
1. Seb merges a Pull Request for a new swipe animation.
2. Vercel detects the merge to `main`.
3. Vercel automatically runs `npm run build` and deploys the new UI to the live URL within 60 seconds.
*(No manual intervention required).*
