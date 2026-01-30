# ⚡ Quick Start Guide

Get WaveChat running on your Android tablet in 15 minutes!

---

## 🎯 What You Need

1. **Android tablet** with custom ROM and root
2. **Termux** app (from F-Droid, not Play Store!)
3. **Supabase account** (free tier is fine)
4. **OpenRouter API key** (for AI features)
5. **Stable WiFi** connection

---

## 🚀 5-Step Setup

### Step 1: Install Termux & Packages (5 min)

```bash
# In Termux:
pkg update && pkg upgrade
pkg install git nodejs python
npm install -g pm2
termux-setup-storage
```

### Step 2: Clone & Setup (3 min)

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/wavechat.git
cd wavechat
chmod +x start-android.sh stop-android.sh
```

### Step 3: Configure Backend (5 min)

```bash
cd backend
cp .env.example .env
nano .env
```

**Minimal .env configuration:**
```env
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENROUTER_API_KEY=your_openrouter_key
JWT_SECRET=your_random_secret_here
CORS_ORIGIN=*
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### Step 4: Build & Install (1 min)

```bash
npm install
npm run build
cd ..
```

### Step 5: Start Everything (1 min)

```bash
./start-android.sh
```

---

## ✅ Verify It's Working

1. **Check services:**
```bash
pm2 status
```
You should see `wavechat-backend` running.

2. **Check logs:**
```bash
pm2 logs wavechat-backend --lines 20
```
Should show "Server running on port 3001"

3. **Get your tablet's IP:**
```bash
ifconfig wlan0 | grep inet
```

4. **Access from browser:**
```
http://YOUR_TABLET_IP:3001
```

You should see the WaveChat login page! 🎉

---

## 🎨 First Time Setup

1. **Create an account:**
   - Go to signup page
   - Enter username, email, password
   - Click "Sign Up"

2. **Login:**
   - Use your credentials
   - You're in!

3. **Try AI chat:**
   - Click "AI Chat" in menu
   - Ask something: "What's the weather in Munich?"
   - AI should respond with current weather

4. **Customize:**
   - Go to Settings
   - Choose AI model
   - Set theme
   - Upload avatar

---

## 🛑 Stop Services

```bash
cd ~/wavechat
./stop-android.sh
```

---

## 🔄 Update WaveChat

```bash
cd ~/wavechat
git pull origin main
cd backend
npm install
npm run build
cd ..
pm2 restart all
```

---

## 🐛 Troubleshooting

### "Cannot connect to server"
```bash
# Check if backend is running
pm2 status

# Check logs for errors
pm2 logs wavechat-backend

# Restart if needed
pm2 restart wavechat-backend
```

### "AI not responding"
- Check OpenRouter API key in `.env`
- Verify you have credits on OpenRouter
- Check logs: `pm2 logs wavechat-backend`

### "Database error"
- Verify Supabase URL and keys in `.env`
- Check Supabase dashboard for issues
- Ensure migrations are run

### "Port already in use"
```bash
# Find what's using port 3001
lsof -i :3001

# Kill it
kill -9 PID_NUMBER

# Or change port in .env
```

---

## 📱 Android-Specific Tips

### Keep Tablet Awake
```bash
termux-wake-lock
```

### Disable Battery Optimization
```
Settings → Apps → Termux → Battery → Unrestricted
```

### Auto-start on Boot
Install **Termux:Boot** app, then:
```bash
mkdir -p ~/.termux/boot
nano ~/.termux/boot/start-wavechat.sh
```

Add:
```bash
#!/data/data/com.termux/files/usr/bin/bash
cd ~/wavechat
./start-android.sh
```

Make executable:
```bash
chmod +x ~/.termux/boot/start-wavechat.sh
```

---

## 🌐 Access from Other Devices

### Same WiFi Network
```
http://TABLET_IP:3001
```

### From Internet (Advanced)
1. Forward port 3001 on your router to tablet IP
2. Access via: `http://YOUR_PUBLIC_IP:3001`
3. Consider using Cloudflare Tunnel for security

---

## 📊 Useful Commands

```bash
# View all logs
pm2 logs

# Monitor resources
pm2 monit

# Restart everything
pm2 restart all

# Stop everything
pm2 stop all

# Delete all processes
pm2 delete all

# Save PM2 config
pm2 save

# View tablet IP
ifconfig wlan0 | grep inet

# Check disk space
df -h

# Check memory
free -h
```

---

## 🆘 Need Help?

1. **Check logs first:** `pm2 logs`
2. **Read full docs:** [DEPLOYMENT.md](DEPLOYMENT.md)
3. **Check GitHub issues**
4. **Verify environment variables**

---

## 🎉 You're Done!

Your WaveChat is now running on your Android tablet!

**What's next?**
- Invite friends to join
- Customize your profile
- Try different AI models
- Set up Telegram feed bot
- Configure custom domain
- Add SSL certificate

Enjoy your self-hosted chat app! 🌊

---

## 📚 More Resources

- [Full Deployment Guide](DEPLOYMENT.md)
- [GitHub Setup](GITHUB_SETUP.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
- [Project README](README.md)
