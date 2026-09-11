# Git Guide & Contributing Rules

Welcome to the team! Since this is a 5-person project, we need to be careful not to overwrite each other's code. Git can be confusing, but if you follow these exact steps, you will never break the project.

---

## 🚀 The Daily Workflow (Copy & Paste these commands)

Every time you sit down to write code, follow these steps in order:

### 1. Get the latest code
Always start by making sure you have what Afina, Max, Lilia, and Gabi worked on yesterday.
```bash
git checkout main
git pull origin main
```

### 2. Create your own safe "branch"
Never type code directly into `main`. Create a branch (a safe copy) to work in.
Name it with your domain, your name, and what you are doing.
```bash
# Examples:
git checkout -b feat/seb-swipe-cards
git checkout -b feat/afina-database-schema
git checkout -b fix/gabi-button-colors
```

### 3. Save your work (Commit)
After you write some code and it works, save it locally to your branch.
```bash
git add .
git commit -m "feat: added the tinder swipe animation"
```
*(Keep your commit messages short and descriptive!)*

### 4. Send it to GitHub (Push)
When you are done for the day, or ready to combine your code with the main project, push it up to GitHub.
```bash
git push origin <your-branch-name>
```

### 5. Merge it! (Pull Requests)
1. Go to our GitHub page.
2. You will see a green button that says **"Compare & pull request"**. Click it.
3. Ask someone else on the team to quickly look at your code. (e.g., Seb asks Gabi to look at the UI).
4. If it looks good, click **"Merge Pull Request"**. Your code is now officially in `main`!

---

## ⚠️ The Golden Rules
1. **Never push directly to `main`.** Always use a branch and a Pull Request.
2. **Never commit `.env` files.** If you put the Google API key or Database password in a `.env` file, make sure `.env` is listed in our `.gitignore` file. If you push passwords to GitHub, bots will steal them in 10 minutes.
3. **Talk to each other.** If Seb and Gabi are both trying to edit the same `App.jsx` file at the exact same time, you will get a "Merge Conflict." Communicate on Discord/Slack about who is working on what file!
