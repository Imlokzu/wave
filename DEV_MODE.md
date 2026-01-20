# Development Mode Guide

## Quick Start for Local Testing

### Step 1: Start Backend in Dev Mode

**Option A: Use the batch file (Windows)**
```
Double-click: start-dev.bat
```

**Option B: Manual command**
```bash
cd backend
npm run dev:server
```

The server will start on `http://localhost:3001`

### Step 2: Use Localhost Frontend Files

Copy the localhost API files to your public folder:

```
Copy frontend-localhost/js/api.js → public/js/api.js
Copy frontend-localhost/js/socket.js → public/js/socket.js
Copy frontend-localhost/js/features-api.js → public/js/features-api.js
```

### Step 3: Open Frontend

Open `public/login.html` in your browser

### Step 4: Test!

Login with: `lokzu2` / `ml120998`

## What Happens in Dev Mode

- Backend runs on port 3001 (not Passenger)
- Frontend connects to `http://localhost:3001`
- Hot reload with ts-node (no need to rebuild)
- Full console logging
- CORS allows localhost

## Switching Back to Production

### Backend (for Plesk deployment):
1. Upload `backend/dist/server.js` (after `npm run build`)
2. Upload `passenger-app.js`
3. Restart app in Plesk

### Frontend:
Restore production files from `frontend-deploy/`:
```
Copy frontend-deploy/js/api.js → public/js/api.js
Copy frontend-deploy/js/socket.js → public/js/socket.js
Copy frontend-deploy/js/features-api.js → public/js/features-api.js
```

## File Structure

```
📁 Root
├── start-dev.bat          ← Start dev server (Windows)
├── backend/
│   ├── src/server.ts      ← Auto-detects dev mode
│   └── .env               ← Environment variables
├── public/                ← Production frontend (api.metrocraft.eu)
├── frontend-localhost/    ← Localhost API files
└── frontend-deploy/       ← Production API files (backup)
```

## Troubleshooting

**Port 3001 already in use?**
- Kill the process: `netstat -ano | findstr :3001` then `taskkill /PID <pid> /F`
- Or change PORT in `.env`

**CORS errors?**
- Make sure you copied the localhost API files
- Check backend console for CORS logs

**Can't connect to database?**
- Check `backend/.env` has SUPABASE_URL and SUPABASE_KEY
- Make sure you're using the correct .env file

## Production vs Development

| Feature | Development | Production |
|---------|------------|------------|
| Backend URL | `http://localhost:3001` | `https://api.metrocraft.eu` |
| Frontend URL | Local file | `https://metrocraft.eu` |
| Server Mode | ts-node (hot reload) | Passenger (compiled) |
| Port Binding | Manual (3001) | Passenger (auto) |
| Environment | NODE_ENV=development | NODE_ENV=production |
