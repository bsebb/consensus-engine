# Frontend Team (Team 1) - 4-Sprint Roadmap

Hey Seb and Gabi!

Since we are using **Contract-Driven Development**, you NEVER have to wait for the Backend Team. If you need data, look at the `API_CONTRACT.md`, create a fake JSON file in `/client/src/mocks/` that matches the contract, and build the UI using that fake data. When the backend is ready, you just swap the fake data for a real `fetch()` call.

Here is your exact timeline.

---

## 🎨 Sprint 1: Architecture & Prototyping
**Goal:** Build the UI shells and Navigation.
*   **Seb:** Set up React Router. Create the 3 main blank screens: "Join Room", "Host Settings", and "The Swipe Deck".
*   **Gabi:** Design the overarching Tailwind CSS theme. Set up the layout, the nav bars, the button styles, and the color palette. 

---

## 📱 Sprint 2: The Core UX & Interactions
**Goal:** Make the app feel like a native mobile app.
*   **Seb:** Build the "Tinder-style" 3-way swipe component. Import the fake `restaurants.json` file. Users should swipe left to **Pass**, swipe right to **Approve**, and have a dedicated middle button to **VETO** (the hard reject).
*   **Gabi:** Build the "Step Zero" onboarding flow. Create clean sliders or inputs for users to anonymously submit their budget limits before they enter the Swipe Deck. Build the "Host Moderation" screen where the Host can manually approve Custom Suggestions.

---

## ⚡ Sprint 3: Real-Time Engine Integration
**Goal:** Make it multiplayer.
*   **Seb:** Install `socket.io-client`. Connect the React app to the backend. Read `SOCKET_EVENTS.md` and make the UI react to the server. (e.g., When the server emits `voting_started`, trigger the router to jump the user to the Swipe Deck screen).
*   **Gabi:** Build the live progress bars. When the Socket receives `vote_status_update`, animate a progress bar saying "3/5 Friends Finished Voting". Build the dramatic "Consensus Reached!" reveal screen.

---

## 🚀 Sprint 4: Polish, Feedback, & PWA
**Goal:** Add the data loop and make it installable.
*   **Gabi:** Build the "Post-Event Review" modal. After the winner is announced, create a 1-5 star form asking if the budget was accurate, and send that JSON payload back to the server.
*   **Seb:** Convert the React app into a Progressive Web App (PWA). Add a `manifest.json` and a Service Worker so users can click "Add to Homescreen" on their iPhones without using the App Store. Deploy the frontend to **Vercel** or **Netlify**.
