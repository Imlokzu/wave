# WaveChat Deployment Guide

## 🚀 Deploying to Android VPS (Tablet)

This guide will help you deploy WaveChat to your Android tablet running a custom ROM with root access.

---

## 📋 Prerequisites

### On Your Android Tablet:
1. **Termux** - Terminal emulator for Android
2. **Root access** - Required for running services on ports 80/443
3. **Node.js** - Version 18+ (install via Termux)
4. **PostgreSQL** or **Supabase account** - For database
5. **Git** - For cloning the repository

### Install Termux Packages:
```bash
pkg update && pkg upgrade
pkg install git nodejs postgresql nginx
```

---

## 🔧 Setup Steps

### 1. Clone the Repository
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/wavechat.git
cd wavechat
```

### 2. Setup Backend

#### Install Dependencies:
```bash
cd backend
npm install
```

#### Create Environment File:
```bash
cp .env.example .env
nano .env
```

#### Configure `.env`:
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenRouter API (for AI features)
OPENROUTER_API_KEY=your_openrouter_api_key

# Weather API (optional)
WEATHER_API_KEY=your_weather_api_key

# Search API (optional)
SEARCH_API_KEY=your_search_api_key

# JWT Secret (generate a random string)
JWT_SECRET=your_random_jwt_secret_here

# CORS Origin (your domain or IP)
CORS_ORIGIN=http://your-tablet-ip:3000
```

#### Build TypeScript:
```bash
npm run build
```

### 3. Setup Frontend

The frontend is static HTML/CSS/JS, so it just needs to be served.

#### Option A: Serve with Backend (Recommended)
The backend already serves static files from the `public` folder. No extra setup needed!

#### Option B: Use Nginx (Advanced)
```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/wavechat
sudo ln -s /etc/nginx/sites-available/wavechat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Setup Database

#### Using Supabase (Recommended):
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Run migrations from `migrations/` folder in SQL editor
4. Copy your project URL and keys to `.env`

#### Using Local PostgreSQL:
```bash
# Start PostgreSQL
pg_ctl -D $PREFIX/var/lib/postgresql start

# Create database
createdb wavechat

# Run migrations
psql wavechat < migrations/001_add_auth_tables.sql
psql wavechat < migrations/002_add_subscriptions_table.sql
# ... run all migration files in order
```

### 5. Setup Python Feed Bot (Optional)

If you want the Telegram feed scraper:

```bash
cd feed-bot
pkg install python
pip install -r requirements.txt

# Create .env file
cp .env.example .env
nano .env
```

Configure feed-bot `.env`:
```env
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
TELEGRAM_PHONE=your_phone_number
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

---

## 🏃 Running the Application

### Development Mode:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Feed Bot (optional)
cd feed-bot
python telegram-scraper.py
```

### Production Mode:

#### Using PM2 (Recommended):
```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start npm --name "wavechat-backend" -- start

# Start feed bot (optional)
cd ../feed-bot
pm2 start telegram-scraper.py --name "wavechat-feedbot" --interpreter python

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### Using Systemd (Alternative):
Create service files in `/etc/systemd/system/`:

**wavechat-backend.service:**
```ini
[Unit]
Description=WaveChat Backend
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/wavechat/backend
ExecStart=/usr/bin/node dist/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable wavechat-backend
sudo systemctl start wavechat-backend
sudo systemctl status wavechat-backend
```

---

## 🌐 Accessing Your App

### Local Network:
```
http://your-tablet-ip:3001
```

### Port Forwarding (Access from Internet):
1. Forward port 3001 on your router to your tablet's IP
2. Access via: `http://your-public-ip:3001`

### Using Nginx Reverse Proxy (Recommended):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 Security Recommendations

1. **Use HTTPS** - Get free SSL with Let's Encrypt
2. **Strong JWT Secret** - Generate with: `openssl rand -base64 32`
3. **Firewall** - Only expose necessary ports
4. **Regular Updates** - Keep dependencies updated
5. **Backup Database** - Regular backups of Supabase/PostgreSQL
6. **Environment Variables** - Never commit `.env` files

---

## 📊 Monitoring

### Check Logs:
```bash
# PM2 logs
pm2 logs wavechat-backend

# Systemd logs
sudo journalctl -u wavechat-backend -f
```

### Monitor Resources:
```bash
# PM2 monitoring
pm2 monit

# System resources
htop
```

---

## 🐛 Troubleshooting

### Backend won't start:
```bash
# Check if port is in use
lsof -i :3001

# Check logs
pm2 logs wavechat-backend --lines 100
```

### Database connection issues:
```bash
# Test Supabase connection
curl -I https://your-project.supabase.co

# Check PostgreSQL
psql wavechat -c "SELECT 1"
```

### Permission issues:
```bash
# Fix file permissions
chmod -R 755 wavechat/
chown -R $USER:$USER wavechat/
```

---

## 🔄 Updating the Application

```bash
cd ~/wavechat
git pull origin main

# Update backend
cd backend
npm install
npm run build
pm2 restart wavechat-backend

# Update feed bot (if needed)
cd ../feed-bot
pip install -r requirements.txt
pm2 restart wavechat-feedbot
```

---

## 📱 Android-Specific Tips

### Battery Optimization:
Disable battery optimization for Termux to prevent services from being killed:
```
Settings → Apps → Termux → Battery → Unrestricted
```

### Wake Lock:
Keep the tablet awake:
```bash
termux-wake-lock
```

### Auto-start on Boot:
Use Termux:Boot app to start services automatically.

---

## 🆘 Support

If you encounter issues:
1. Check logs: `pm2 logs`
2. Verify environment variables: `cat backend/.env`
3. Test database connection
4. Check firewall rules
5. Verify Node.js version: `node --version`

---

## 📝 Notes

- **Performance**: Android tablets may have limited resources. Monitor CPU/RAM usage.
- **Storage**: Ensure sufficient storage for logs and uploads.
- **Network**: Stable WiFi connection recommended.
- **Power**: Keep tablet plugged in for 24/7 operation.

---

Good luck with your deployment! 🚀
