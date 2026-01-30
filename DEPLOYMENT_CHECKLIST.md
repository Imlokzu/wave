# ✅ WaveChat Deployment Checklist

Use this checklist to ensure a smooth deployment to your Android VPS.

---

## 📋 Pre-Deployment

### Local Setup
- [ ] All code is committed to Git
- [ ] `.env` files are NOT in Git (check `.gitignore`)
- [ ] `node_modules/` is NOT in Git
- [ ] Backend builds successfully (`npm run build`)
- [ ] No TypeScript errors
- [ ] All tests pass (if you have tests)

### GitHub Setup
- [ ] Created GitHub repository
- [ ] Pushed code to GitHub
- [ ] Repository is public or private (your choice)
- [ ] README.md is complete
- [ ] .env.example is included

### API Keys & Services
- [ ] Supabase project created
- [ ] Supabase URL and keys obtained
- [ ] OpenRouter API key obtained
- [ ] Weather API key obtained (optional)
- [ ] Search API key obtained (optional)
- [ ] ImgBB API key obtained (optional)
- [ ] Telegram API credentials obtained (for feed bot)

---

## 🤖 Android Tablet Setup

### Termux Installation
- [ ] Termux installed from F-Droid (not Play Store!)
- [ ] Termux updated: `pkg update && pkg upgrade`
- [ ] Storage permission granted: `termux-setup-storage`
- [ ] Battery optimization disabled for Termux

### Required Packages
- [ ] Git installed: `pkg install git`
- [ ] Node.js installed: `pkg install nodejs`
- [ ] Python installed: `pkg install python` (for feed bot)
- [ ] PM2 installed: `npm install -g pm2`

### Optional Packages
- [ ] PostgreSQL installed: `pkg install postgresql` (if not using Supabase)
- [ ] Nginx installed: `pkg install nginx` (for reverse proxy)

---

## 📦 Deployment Steps

### 1. Clone Repository
- [ ] Cloned from GitHub: `git clone https://github.com/YOUR_USERNAME/wavechat.git`
- [ ] Navigated to project: `cd wavechat`

### 2. Backend Setup
- [ ] Navigated to backend: `cd backend`
- [ ] Installed dependencies: `npm install`
- [ ] Created `.env` file: `cp .env.example .env`
- [ ] Configured all environment variables in `.env`
- [ ] Built TypeScript: `npm run build`
- [ ] Verified build output exists: `ls dist/`

### 3. Database Setup
- [ ] Supabase project configured
- [ ] All migrations run in Supabase SQL editor
- [ ] Database tables created successfully
- [ ] Test connection works

### 4. Feed Bot Setup (Optional)
- [ ] Navigated to feed-bot: `cd feed-bot`
- [ ] Installed Python dependencies: `pip install -r requirements.txt`
- [ ] Created `.env` file
- [ ] Configured Telegram API credentials
- [ ] Tested Telegram connection

---

## 🚀 Starting Services

### Using Start Script
- [ ] Made script executable: `chmod +x start-android.sh`
- [ ] Ran start script: `./start-android.sh`
- [ ] Verified services are running: `pm2 status`

### Manual Start (Alternative)
- [ ] Started backend: `cd backend && pm2 start npm --name wavechat-backend -- start`
- [ ] Started feed bot: `cd feed-bot && pm2 start telegram-scraper.py --name wavechat-feedbot --interpreter python`
- [ ] Saved PM2 config: `pm2 save`

---

## 🧪 Testing

### Backend Tests
- [ ] Backend is running: `pm2 status`
- [ ] Backend logs look good: `pm2 logs wavechat-backend`
- [ ] API responds: `curl http://localhost:3001/api/health`
- [ ] No errors in logs

### Frontend Tests
- [ ] Can access homepage: `http://tablet-ip:3001`
- [ ] Login page loads
- [ ] Signup works
- [ ] Login works
- [ ] Chat interface loads
- [ ] Can send messages
- [ ] Real-time updates work
- [ ] AI chat works
- [ ] File uploads work
- [ ] Images display correctly

### AI Features
- [ ] AI chat responds
- [ ] Model selection works
- [ ] Web search works
- [ ] Weather queries work
- [ ] Code generation works
- [ ] Translation works

### Feed Bot (if enabled)
- [ ] Feed bot is running: `pm2 status`
- [ ] Feed bot logs look good: `pm2 logs wavechat-feedbot`
- [ ] Telegram channels are being scraped
- [ ] Posts appear in feed

---

## 🌐 Network Access

### Local Network
- [ ] Can access from same WiFi: `http://tablet-ip:3001`
- [ ] Other devices can connect
- [ ] Socket.io connections work

### Internet Access (Optional)
- [ ] Port forwarding configured on router
- [ ] Can access from internet: `http://public-ip:3001`
- [ ] Domain name configured (if using)
- [ ] SSL certificate installed (if using HTTPS)

---

## 🔒 Security

### Environment Variables
- [ ] All API keys are in `.env` files
- [ ] `.env` files are NOT in Git
- [ ] JWT secret is strong and random
- [ ] Database credentials are secure

### Firewall
- [ ] Only necessary ports are open
- [ ] Port 3001 is accessible (or your chosen port)
- [ ] SSH port is secure (if using)

### Updates
- [ ] System packages are updated
- [ ] Node.js is latest LTS version
- [ ] Dependencies are up to date

---

## 📊 Monitoring

### PM2 Setup
- [ ] PM2 is monitoring processes: `pm2 monit`
- [ ] PM2 auto-restart is enabled
- [ ] PM2 startup script configured: `pm2 startup`
- [ ] PM2 config is saved: `pm2 save`

### Logs
- [ ] Can view logs: `pm2 logs`
- [ ] Logs are rotating (not filling disk)
- [ ] Error logs are being captured

### Performance
- [ ] CPU usage is reasonable
- [ ] Memory usage is reasonable
- [ ] Disk space is sufficient
- [ ] Network latency is acceptable

---

## 🔄 Maintenance

### Regular Tasks
- [ ] Backup database regularly
- [ ] Update dependencies monthly
- [ ] Check logs for errors
- [ ] Monitor disk space
- [ ] Restart services if needed

### Update Procedure
- [ ] Pull latest code: `git pull origin main`
- [ ] Install new dependencies: `npm install`
- [ ] Rebuild: `npm run build`
- [ ] Restart services: `pm2 restart all`

---

## 🆘 Troubleshooting

### Common Issues
- [ ] Know how to check logs: `pm2 logs`
- [ ] Know how to restart services: `pm2 restart all`
- [ ] Know how to stop services: `pm2 stop all`
- [ ] Have backup of `.env` files
- [ ] Have backup of database

### Emergency Contacts
- [ ] GitHub repository URL saved
- [ ] Supabase dashboard URL saved
- [ ] API provider dashboards bookmarked
- [ ] Documentation links saved

---

## ✅ Deployment Complete!

Once all items are checked:

1. Your WaveChat is running on your Android tablet
2. You can access it from your local network
3. All features are working
4. Services auto-restart on failure
5. You know how to update and maintain it

**Congratulations! 🎉**

---

## 📝 Notes

Add any custom notes or configurations specific to your setup:

```
[Your notes here]
```

---

## 🔗 Quick Links

- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [GITHUB_SETUP.md](GITHUB_SETUP.md) - GitHub setup instructions
- [README.md](README.md) - Project overview
- Backend logs: `pm2 logs wavechat-backend`
- Feed bot logs: `pm2 logs wavechat-feedbot`
- PM2 monitoring: `pm2 monit`

---

Last updated: [Date]
Deployed by: [Your name]
Tablet model: [Your tablet model]
