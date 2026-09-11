# Day 0: The Absolute Beginner Setup Guide

If you have never coded on a team before, do not worry. Follow this guide exactly, step-by-step, and your computer will be ready to go.

## Step 1: Install the Required Software
Before you can run any code, your computer needs to understand JavaScript and Git.
1. **Download Node.js:** Go to [nodejs.org](https://nodejs.org/) and download the "LTS" (Long Term Support) version. Click through the installer (just keep hitting "Next"). This allows your computer to run JavaScript outside of a web browser.
2. **Download Git:** Go to [git-scm.com](https://git-scm.com/downloads) and download it for your operating system. Keep all the default settings in the installer.
3. **Download VS Code:** Go to [code.visualstudio.com](https://code.visualstudio.com/) and install it. This is the text editor we will all use to write our code.

## Step 2: Get the Code onto your Computer (Cloning)
Right now, the code only lives on GitHub. We need to download a "clone" of it to your laptop.
1. Open **VS Code**.
2. Click on `Terminal` at the very top menu bar, then click `New Terminal`. A black box will appear at the bottom of your screen.
3. Type this exact command and hit Enter:
   ```bash
   git clone https://github.com/bsebb/consensus-engine.git
   ```
4. Now, open the folder in VS Code: Click `File > Open Folder` and select the `consensus-engine` folder that was just created.

## Step 3: Install the Project Dependencies
Our code relies on external libraries (like React and Socket.io). We need to download them.

**If you are Team 1 (Frontend):**
Open a new terminal in VS Code and type:
```bash
cd client
npm install
```

**If you are Team 2 (Backend):**
Open a new terminal in VS Code and type:
```bash
cd server
npm install
```

## Step 4: Learn How to Save Your Work
You are now ready to code! But before you type a single line, you MUST read the [Git Guide for Beginners](../CONTRIBUTING.md). It explains the exact commands to use so you don't accidentally delete your teammates' work.
