@echo off
echo ========================================
echo   Telegram Feed Bot - Quick Start
echo ========================================
echo.

cd feed-bot

REM Check if virtual environment exists
if not exist ".venv" (
    echo [1/3] Creating virtual environment...
    python -m venv .venv
    echo.
)

echo [2/3] Activating virtual environment...
call .venv\Scripts\activate.bat
echo.

REM Check if requirements are installed
echo [3/3] Installing/updating dependencies...
pip install -q -r requirements.txt
echo.

echo ========================================
echo   Starting Feed Bot...
echo ========================================
echo.
echo TIP: On first run, you'll need to authenticate with Telegram
echo      - Scan the QR code with your phone, OR
echo      - Enter your phone number and verification code
echo.
echo Press Ctrl+C to stop the bot
echo.

python telegram-scraper.py

pause
