# Localhost Testing Files

These are modified versions of the frontend API files configured to connect to `localhost:3001` instead of `api.metrocraft.eu`.

## Quick Start

### Method 1: Use start-dev.bat (Easiest)

1. **Double-click `start-dev.bat`** in the root folder
2. **Copy the localhost API files:**
   - Copy `frontend-localhost/js/api.js` to `public/js/api.js`
   - Copy `frontend-localhost/js/socket.js` to `public/js/socket.js`
   - Copy `frontend-localhost/js/features-api.js` to `public/js/features-api.js`
3. **Open `public/login.html`** in your browser
4. **Test your app!**

### Method 2: Manual Start

1. **Start backend:**
   ```
   cd backend
   npm run dev:server
   ```

2. **Copy localhost API files to public/js/**

3. **Open `public/login.html`** in browser

## Files Included

- `js/api.js` - API client configured for localhost
- `js/socket.js` - Socket.IO client configured for localhost  
- `js/features-api.js` - Features API configured for localhost

## What's Different

These files connect to:
- **API Base URL:** `http://localhost:3001` (instead of `https://api.metrocraft.eu`)
- **Socket URL:** `http://localhost:3001` (instead of `https://api.metrocraft.eu`)

Everything else is identical to the production files.

## Important Notes

- Backend runs on port 3001 in development mode
- Make sure your `.env` file has all required variables
- CORS is already configured to allow localhost
- **Don't commit these localhost files to production!**
- When done testing, restore the production files from `frontend-deploy/`

## Restoring Production Files

When you're done testing locally, restore production files:
```
Copy frontend-deploy/js/api.js to public/js/api.js
Copy frontend-deploy/js/socket.js to public/js/socket.js
Copy frontend-deploy/js/features-api.js to public/js/features-api.js
```
