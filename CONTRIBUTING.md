# Contributing Guidelines

To avoid merge conflicts across our 5-person team, strictly adhere to these Git protocols.

## 1. Branch Naming Convention
Never push directly to `main`. Create a branch from `main` using the following prefixes:
*   `feat/` - A new feature (e.g., `feat/swipe-ui`, `feat/google-api`)
*   `fix/` - A bug fix (e.g., `fix/cors-error`, `fix/socket-disconnect`)
*   `docs/` - Documentation updates (e.g., `docs/update-readme`)
*   `refactor/` - Code restructuring without changing behavior (e.g., `refactor/graph-math`)

**Example:** `git checkout -b feat/socket-room-state`

## 2. Commit Message Protocol
We use conventional commits. Keep it short and descriptive.
*   `feat(ui): add tinder-style swipe animations`
*   `fix(db): correct prisma unique constraint on votes`
*   `chore(deps): install socket.io-client`

## 3. Pull Request (PR) Rules
1.  **Do not merge your own PR.** You must request a review from at least 1 teammate (preferably someone from the opposite domain: Frontend reviews Backend, Backend reviews Frontend).
2.  **Mocking Policy:** Frontend developers are not allowed to say "I'm blocked waiting on the backend." Use the `API_CONTRACT.md` to mock the JSON response and build the UI.
3.  **No `.env` files in PRs:** Ensure your `.gitignore` blocks `.env` files. If you accidentally commit a Google API key, the PR will be rejected.

## 4. Resolving Conflicts
If your branch has a conflict with `main`:
1. `git checkout main`
2. `git pull origin main`
3. `git checkout your-branch`
4. `git rebase main`
5. Resolve the conflicts in your IDE, then force push to your branch `git push -f`.
