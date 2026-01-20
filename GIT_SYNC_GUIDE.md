# Git Sync Guide - Windows to Arch Linux

## Step 1: Create GitHub Repository (on Windows)

1. Go to https://github.com/new
2. Create a new repository (e.g., "wave-messenger")
3. Make it **Private** (recommended since it contains your project)
4. Don't initialize with README (we already have files)

## Step 2: Push from Windows PC

```bash
# Add all files (respecting .gitignore)
git add .

# Create first commit
git commit -m "Initial commit - Wave Messenger project"

# Add your GitHub repository as remote (replace with your repo URL)
git remote add origin https://github.com/Imlokzu/wave.git

# Push to GitHub
git push -u origin master
```

If you get authentication error, you'll need a Personal Access Token:
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo` (full control)
4. Copy the token
5. Use it as password when pushing

## Step 3: Clone on Arch Linux Laptop

```bash
# Install git if not already installed
sudo pacman -S git

# Clone the repository
git clone https://github.com/Imlokzu/wave.git
cd wave

# Copy environment variables
cp .env.example .env
cp backend/.env.example backend/.env
cp feed-bot/.env.example feed-bot/.env

# Edit .env files with your actual credentials
nano .env
nano backend/.env
nano feed-bot/.env
```

## Step 4: Install Dependencies on Arch

```bash
# Install Node.js and npm
sudo pacman -S nodejs npm

# Install Python and pip
sudo pacman -S python python-pip

# Install project dependencies
npm install
cd backend && npm install && cd ..

# Install Python dependencies for feed bot
cd feed-bot
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

## Step 5: Regular Sync Workflow

### From Windows (push changes):
```bash
# Check what changed
git status

# Add changes
git add .

# Commit with message
git commit -m "Description of changes"

# Push to GitHub
git push
```

### On Arch Linux (pull changes):
```bash
# Pull latest changes
git pull

# Rebuild if needed
npm run build
cd backend && npm run build && cd ..
```

## Important Notes

- **Never commit `.env` files** - they contain secrets!
- Always use `.env.example` as template
- The `.gitignore` file protects sensitive data
- `node_modules/` and build files are excluded (will be regenerated)
- Telegram session files are excluded (you'll need to re-authenticate)

## Quick Commands Reference

```bash
# Check status
git status

# See what changed
git diff

# View commit history
git log --oneline

# Discard local changes
git checkout -- filename

# Pull and overwrite local changes
git fetch origin
git reset --hard origin/master
```

## Troubleshooting

**Problem:** "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/Imlokzu/wave.git
```

**Problem:** Merge conflicts
```bash
# Keep remote version
git checkout --theirs filename

# Keep local version
git checkout --ours filename

# After resolving
git add .
git commit -m "Resolved conflicts"
```

**Problem:** Need to undo last commit
```bash
# Undo but keep changes
git reset --soft HEAD~1

# Undo and discard changes
git reset --hard HEAD~1
```
