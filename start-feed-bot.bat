@echo off
echo ========================================
echo Starting Telegram Feed Bot
echo ========================================
echo.
echo Bot will run on: http://localhost:3000
echo.
echo Press Ctrl+C to stop the bot
echo ========================================
echo.

cd feed-bot
.venv\Scripts\python.exe -m uvicorn api:app --reload --host 0.0.0.0 --port 3000
