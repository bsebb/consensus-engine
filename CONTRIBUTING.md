# The Ultimate Beginner's Guide to Git

Welcome to the team! If you have never used Git before, do not panic. Git is actually very simple once you understand *why* we use it.

## 🕰️ What is Git?
Imagine you are playing a video game and you are about to fight a massive boss. What do you do? **You save your game.** If you die, you just reload the save file. 

Git is exactly that, but for code. It is a "time machine." If you accidentally delete a file or write code that breaks the app, you don't have to panic. With Git, you can instantly rewind time to when the code was working. GitHub is just the website where we store everyone's "save files" in the cloud so we can share them.

---

## 🌳 What is a "Branch"? (And the Golden Rule)
Our project has one master timeline called the **`main` branch**. 
**THE GOLDEN RULE:** **Never, ever write code directly into the `main` branch.** 

If all 5 of us wrote code into `main` at the same time, we would constantly overwrite each other's work and the app would crash. 

Instead, when you want to build something, you create a **Branch**. A branch is like taking a photocopy of the `main` code, going into your own private sandbox, and building your feature. When you are 100% sure your code works, you ask the team to "Merge" your branch back into `main`.

### How to Name Your Branch
We use a specific naming format so everyone knows exactly what you are doing without having to ask you.
**Format:** `<type>/<your-name>-<what-you-are-doing>`

**Types:**
*   `feat/` : You are building a new feature (e.g., a new button, a new database table).
*   `fix/` : You are fixing a bug.
*   `docs/` : You are just changing text files like this one.

**Examples:**
*   ✅ `feat/seb-swipe-cards` *(Seb is building the swipe UI)*
*   ✅ `feat/afina-database-schema` *(Afina is building the Postgres tables)*
*   ✅ `fix/max-socket-crash` *(Max is fixing a bug where the server crashes)*
*   ❌ `my-code` *(Bad name. Who are you? What code?)*

---

## 🚀 The Daily Workflow (What the commands actually do)

Every time you sit down at your computer to write code, follow these steps:

### Step 1: Get the latest code from your teammates
Before you start working, you need to download whatever your team finished yesterday.
```bash
git checkout main
git pull origin main
```
*   **`git checkout main`** -> "Hey Git, switch my computer to the main timeline."
*   **`git pull origin main`** -> "Hey Git, download the newest main timeline from GitHub."

### Step 2: Create your private sandbox
Now that your `main` is up to date, create your new branch.
```bash
git checkout -b feat/seb-swipe-cards
```
*   **`git checkout -b`** -> "Hey Git, create a brand new Branch (-b) and switch me into it." You are now safe. You can delete every file on your computer, and it won't affect `main`.

### Step 3: Write your code & Save it (Commit)
Go into VS Code, write your code, and test it. Once it works, it's time to "Save your game".
```bash
git add .
git commit -m "feat: added the tinder swipe animation"
```
*   **`git add .`** -> "Hey Git, look at *all* (`.`) the files I just changed and get ready to save them."
*   **`git commit -m "message"`** -> "Hey Git, officially save this code. Here is a message (-m) explaining what I did so I can remember it later."

### Step 4: Send your safe branch to GitHub (Push)
Your code is saved on your laptop, but your teammates can't see it yet.
```bash
git push origin feat/seb-swipe-cards
```
*   **`git push origin <branch>`** -> "Hey Git, upload my specific branch to GitHub (origin)."

### Step 5: The Pull Request (PR)
1. Go to our repository on GitHub.com.
2. You will see a big green button that says **"Compare & pull request"**. Click it.
3. A Pull Request is you saying: *"Hey team, my code is done in my sandbox. Can someone check it to make sure it's good?"*
4. Seb should ask Gabi to check his UI code. Afina should ask Max to check her database code.
5. If the reviewer says it looks good, you click **"Merge Pull Request"**. 
6. Boom! Your code is taken out of your sandbox and officially added to the `main` timeline for everyone to use.

Congratulations, you now know how to use Git like a professional software engineer!
