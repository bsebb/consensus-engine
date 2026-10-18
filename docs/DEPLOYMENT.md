# Deployment & DevOps Strategy

To ensure a seamless, professional launch in Sprint 4, we will use a **Continuous Integration / Continuous Deployment (CI/CD)** pipeline. Nobody will manually upload files to a server. 

Because we use a Monorepo, we split our deployment across two distinct cloud providers optimized for their specific tasks.

---

## 1. Frontend (Vercel)
**Lead DevOps: Seb**
*   **Target Folder (Root Directory):** `client`
*   **Framework Preset:** Vite
*   **Build Command:** `npm run build`
*   **Output Directory:** `dist`
*   **Environment Variables:**
    *   `VITE_SERVER_URL`: `https://<your-render-service>.onrender.com` (leave empty for local dev proxy)
*   **Why Vercel?** Vercel deploys our SPA globally to Edge CDNs with instant cache invalidation. `client/vercel.json` ensures client-side routes like `/lobby/:pin` resolve correctly on page refresh.

## 2. Backend & Database (Render)
**Lead DevOps: Lilia**
*   **Target Folder (Root Directory):** `server`
*   **Runtime:** Node.js
*   **Build Command:** `npm install` (triggers `postinstall: prisma generate`)
*   **Start Command:** `npm start`
*   **Database:** Render PostgreSQL (or Neon.tech / Supabase)
*   **Environment Variables:**
    *   `DATABASE_URL`: `postgresql://user:password@host/consensus_db`
    *   `PORT`: `10000` (auto-bound by Render)
    *   `FOURSQUARE_API_KEY`: *(Optional)* API key for venue discovery
*   **Why Render?** Persistent containers support always-on Socket.io WebSocket connections during real-time multiplayer voting sessions.

---

## 3. The CORS Whitelist
Both Express and Socket.io are configured to accept cross-origin connections by default:
```javascript
app.use(cors());
const io = new Server(httpServer, { cors: { origin: '*' } });
```
In production, you can restrict this to your specific Vercel domain if desired.

## 4. CI/CD Workflow
Once configured, deployment is automatic:
1. Push changes to `main` on GitHub.
2. Vercel automatically runs `npm run build` for `client` and updates the live site in ~30 seconds.
3. Render automatically triggers `npm install` and restarts the container for `server`.
4. Mobile QR codes dynamically encode the live Vercel domain (`https://<app>.vercel.app/?pin=1234`), enabling zero-install ingress across all smartphones.
