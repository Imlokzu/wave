# Wave App Deployment Guide

## Production Deployment on Plesk

### Overview
Wave is deployed with the following subdomain structure:
- **metrocraft.eu** or **app.metrocraft.eu** - Frontend (static files)
- **api.metrocraft.eu** - Backend API (Node.js server)
- **admin.metrocraft.eu** - Admin panel (static files)

### Prerequisites
- Plesk hosting with Node.js support
- Domain: metrocraft.eu
- Node.js 18+ installed
- PostgreSQL database (Supabase)

---

## Step 1: Domain & Subdomain Setup in Plesk

### Create Subdomains
1. Go to **Websites & Domains** in Plesk
2. Click **Add Subdomain**
3. Create the following subdomains:
   - `api.metrocraft.eu` - Point to `/backend` folder
   - `admin.metrocraft.eu` - Point to `/admin/public` folder
   - `app.metrocraft.eu` (optional) - Point to `/public` folder
4. For main domain `metrocraft.eu` - Point to `/public` folder

---

## Step 2: Upload Files

### Upload Structure
```
/httpdocs/
├── backend/              # Backend Node.js application
│   ├── src/
│   ├── node_modules/
│   ├── package.json
│   ├── .env
│   └── ...
├── public/               # Frontend static files
│   ├── index.html
│   ├── js/
│   ├── css/
│   └── ...
└── admin/                # Admin panel
    └── public/
        ├── index.html
        ├── js/
        └── ...
```

### Upload via FTP/SFTP
1. Connect to your server via FTP/SFTP
2. Upload all files to `/httpdocs/`
3. Ensure folder structure matches above

---

## Step 3: Backend Configuration

### 1. Update Environment Variables
Edit `backend/.env`:
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Production URLs
FRONTEND_URL=https://metrocraft.eu
API_URL=https://api.metrocraft.eu
ADMIN_URL=https://admin.metrocraft.eu

# Supabase Configuration
SUPABASE_URL=https://ocvusoidmvjlbssblnxw.supabase.co
SUPABASE_KEY=your_supabase_key
SUPABASE_BUCKET=files

# AI Service Configuration
OPENAI_API_KEY=your_openai_key
LANGSEARCH_API_KEY=your_langsearch_key

# Other settings...
```

### 2. Install Dependencies
SSH into your server and run:
```bash
cd /var/www/vhosts/metrocraft.eu/httpdocs/backend
npm install --production
```

### 3. Build TypeScript
```bash
npm run build
```

---

## Step 4: Setup Node.js Application in Plesk

### Configure Node.js App
1. Go to **Websites & Domains** → **Node.js**
2. Click **Enable Node.js**
3. Configure:
   - **Application mode**: Production
   - **Document root**: `/httpdocs/backend`
   - **Application startup file**: `dist/server.js` (or `src/server.ts` if using ts-node)
   - **Node.js version**: 18.x or higher
   - **Environment variables**: Add from `.env` file

### Application Startup
The app will run on internal port 3001. Plesk will handle the reverse proxy automatically.

---

## Step 5: Setup Reverse Proxy for API

### Configure Nginx Reverse Proxy
1. Go to **Websites & Domains** → **Apache & nginx Settings**
2. For `api.metrocraft.eu`, add to **Additional nginx directives**:

```nginx
location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}

# WebSocket support for Socket.IO
location /socket.io/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

3. Click **OK** to save

---

## Step 6: SSL Certificates

### Enable HTTPS
1. Go to **Websites & Domains** → **SSL/TLS Certificates**
2. For each subdomain:
   - Click **Install** next to Let's Encrypt
   - Select all subdomains
   - Click **Get it free**
3. Enable **Permanent SEO-safe 301 redirect from HTTP to HTTPS**

---

## Step 7: Static File Serving

### Frontend (metrocraft.eu)
- Already configured to serve from `/public`
- No additional setup needed

### Admin Panel (admin.metrocraft.eu)
1. Go to **Websites & Domains** → **admin.metrocraft.eu**
2. Set **Document root** to `/httpdocs/admin/public`
3. Enable **Static files** serving

---

## Step 8: Database Migration

### Run Supabase Migrations
1. Connect to Supabase dashboard
2. Go to **SQL Editor**
3. Run migration files in order:
   ```
   migrations/001_add_auth_tables.sql
   migrations/002_add_subscriptions_table.sql
   migrations/003_add_telegram_feed_tables_fixed.sql
   ...
   migrations/015_add_message_reports.sql
   ```

---

## Step 9: Start the Application

### Start Node.js App
1. In Plesk, go to **Node.js**
2. Click **Enable Node.js** (if not already enabled)
3. Click **Restart App**

### Verify
- Backend API: https://api.metrocraft.eu/health
- Frontend: https://metrocraft.eu
- Admin: https://admin.metrocraft.eu

---

## Step 10: Process Management (Optional)

### Using PM2 for Better Process Management
If Plesk's Node.js manager is not sufficient:

```bash
# Install PM2 globally
npm install -g pm2

# Start app with PM2
cd /var/www/vhosts/metrocraft.eu/httpdocs/backend
pm2 start dist/server.js --name wave-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

---

## Troubleshooting

### Check Logs
- **Plesk Logs**: Websites & Domains → Logs
- **Node.js Logs**: Websites & Domains → Node.js → Application Logs
- **PM2 Logs**: `pm2 logs wave-api`

### Common Issues

#### 1. API Not Responding
- Check if Node.js app is running: `pm2 status` or check Plesk Node.js panel
- Verify port 3001 is not blocked
- Check nginx reverse proxy configuration

#### 2. CORS Errors
- Verify CORS settings in `backend/src/server.ts`
- Ensure all production domains are listed

#### 3. WebSocket Connection Failed
- Check nginx WebSocket configuration
- Verify `/socket.io/` location block in nginx

#### 4. 502 Bad Gateway
- Backend app is not running
- Port 3001 is not accessible
- Check Node.js app logs

---

## Environment-Specific Notes

### Development vs Production
The frontend JavaScript files automatically detect the environment:
- **localhost** → Uses `http://localhost:3001`
- **Production** → Uses `https://api.metrocraft.eu`

No code changes needed when deploying!

### Files with Environment Detection
- `public/js/api.js`
- `public/js/socket.js`
- `public/js/features-api.js`
- `admin/public/js/admin.js`

---

## Security Checklist

- [ ] SSL certificates installed for all domains
- [ ] Environment variables secured (not in public folders)
- [ ] Supabase RLS policies configured
- [ ] Admin routes protected with authentication
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] API keys stored in `.env` (not committed to git)

---

## Maintenance

### Update Application
```bash
# Pull latest code
git pull origin main

# Install dependencies
cd backend
npm install

# Rebuild
npm run build

# Restart app
pm2 restart wave-api
# OR in Plesk: Node.js → Restart App
```

### Monitor Application
```bash
# PM2 monitoring
pm2 monit

# Check logs
pm2 logs wave-api --lines 100
```

---

## Support

For issues or questions:
- Check logs first
- Verify all environment variables are set
- Ensure database migrations are run
- Test API health endpoint: https://api.metrocraft.eu/health

---

**Deployment Complete! 🚀**

Your Wave app should now be live at:
- Frontend: https://metrocraft.eu
- API: https://api.metrocraft.eu
- Admin: https://admin.metrocraft.eu
