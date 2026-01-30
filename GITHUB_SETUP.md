# 📦 GitHub Setup Guide

## Step 1: Initialize Git Repository (if not already done)

```bash
cd /path/to/your/wavechat/project
git init
git add .
git commit -m "Initial commit: WaveChat application"
```

## Step 2: Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click the **+** icon → **New repository**
3. Name it: `wavechat`
4. Description: "Modern real-time chat with AI assistant"
5. Choose **Public** or **Private**
6. **DO NOT** initialize with README (we already have one)
7. Click **Create repository**

## Step 3: Connect Local Repository to GitHub

```bash
# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/wavechat.git

# Verify remote
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Verify .gitignore

Make sure sensitive files are NOT pushed:

```bash
# Check what will be committed
git status

# If you see .env files or node_modules, they should NOT be there!
# Make sure .gitignore is working
cat .gitignore
```

**CRITICAL**: Never commit these files:
- `.env` files (contain API keys!)
- `node_modules/`
- `dist/` (build output)
- `uploads/` (user data)
- `session.session` (Telegram session)

## Step 5: Create GitHub Secrets (for CI/CD)

If you want to use GitHub Actions for deployment:

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `OPENROUTER_API_KEY`
   - `JWT_SECRET`
   - etc.

## Step 6: Clone to Your Android Tablet

On your Android tablet with Termux:

```bash
# Install git if not already installed
pkg install git

# Clone your repository
cd ~
git clone https://github.com/YOUR_USERNAME/wavechat.git
cd wavechat

# Make scripts executable
chmod +x start-android.sh
chmod +x stop-android.sh

# Follow DEPLOYMENT.md for setup
```

## Step 7: Keep Your Repository Updated

### On Your Development Machine:
```bash
# Make changes
git add .
git commit -m "Description of changes"
git push origin main
```

### On Your Android Tablet:
```bash
# Pull latest changes
cd ~/wavechat
git pull origin main

# Restart services
./stop-android.sh
./start-android.sh
```

## 🔒 Security Checklist

Before pushing to GitHub:

- [ ] `.env` files are in `.gitignore`
- [ ] No API keys in code
- [ ] No passwords in code
- [ ] `node_modules/` is ignored
- [ ] Sensitive user data is ignored
- [ ] Session files are ignored

## 📝 Recommended Repository Settings

### Branch Protection:
1. Go to **Settings** → **Branches**
2. Add rule for `main` branch:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date

### Collaborators:
1. Go to **Settings** → **Collaborators**
2. Add team members if needed

### Topics:
Add these topics to your repository for discoverability:
- `chat-application`
- `real-time`
- `socket-io`
- `ai-assistant`
- `nodejs`
- `typescript`
- `telegram`
- `android-vps`

## 🚀 Optional: GitHub Actions for Auto-Deploy

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Android VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/wavechat
            git pull origin main
            cd backend
            npm install
            npm run build
            pm2 restart wavechat-backend
```

## 📊 Repository Structure

Your GitHub repository should look like:

```
wavechat/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── backend/
├── public/
├── feed-bot/
├── migrations/
├── .gitignore
├── .env.example
├── README.md
├── DEPLOYMENT.md
├── GITHUB_SETUP.md
├── start-android.sh
├── stop-android.sh
└── package.json
```

## 🆘 Troubleshooting

### "Permission denied" when pushing:
```bash
# Use HTTPS with token
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/wavechat.git

# Or use SSH
git remote set-url origin git@github.com:YOUR_USERNAME/wavechat.git
```

### Accidentally committed .env file:
```bash
# Remove from git but keep locally
git rm --cached .env
git commit -m "Remove .env from repository"
git push origin main

# Then change all your API keys immediately!
```

### Large files error:
```bash
# Remove large files from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/large/file" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

---

## ✅ You're Done!

Your WaveChat project is now on GitHub and ready to deploy to your Android VPS!

Next steps:
1. Follow [DEPLOYMENT.md](DEPLOYMENT.md) to deploy to your tablet
2. Run `./start-android.sh` to start all services
3. Access your app at `http://your-tablet-ip:3001`

Happy coding! 🎉
