@echo off
echo ========================================
echo Starting Wave in FULL DEVELOPMENT mode
echo ========================================
echo.
echo Backend: http://localhost:3001
echo Feed Bot: http://localhost:3000
echo.
echo This will open 2 windows:
echo   1. Backend Server (Node.js)
echo   2. Feed Bot (Python)
echo.
echo Press any key to start...
pause > nul

echo.
echo Starting Backend Server...
start "Wave Backend" cmd /k "cd backend && set NODE_ENV=development && npm run dev:server"

timeout /t 2 > nul

echo Starting Feed Bot...
start "Wave Feed Bot" cmd /k "cd feed-bot && .venv\Scripts\python.exe -m uvicorn api:app --reload --host 0.0.0.0 --port 3000"

echo.
echo ========================================
echo Both services are starting!
echo ========================================
echo.
echo Backend: http://localhost:3001
echo Feed Bot: http://localhost:3000
echo.
echo Close the terminal windows to stop the services
echo ========================================
