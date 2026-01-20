@echo off
echo ========================================
echo Starting Wave in DEVELOPMENT mode
echo ========================================
echo.
echo Backend will run on: http://192.168.2.34:3001
echo Frontend files in: public/
echo.
echo Open in browser: http://192.168.2.34:3001/login.html
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

cd backend
set NODE_ENV=development
npm run dev:server
