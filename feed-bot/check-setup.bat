@echo off
echo ========================================
echo   Feed Bot - Setup Checker
echo ========================================
echo.

REM Check Python
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo        Download from: https://www.python.org/downloads/
    goto :end
) else (
    python --version
    echo [OK] Python is installed
)
echo.

REM Check if in feed-bot directory
if not exist "telegram-scraper.py" (
    echo [ERROR] Not in feed-bot directory
    echo        Run this from the feed-bot folder
    goto :end
)

REM Check virtual environment
echo [2/5] Checking virtual environment...
if exist ".venv" (
    echo [OK] Virtual environment exists
) else (
    echo [WARN] Virtual environment not found
    echo        Creating it now...
    python -m venv .venv
    echo [OK] Virtual environment created
)
echo.

REM Activate and check dependencies
echo [3/5] Checking dependencies...
call .venv\Scripts\activate.bat
pip show telethon >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Dependencies not installed
    echo        Installing now...
    pip install -q -r requirements.txt
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies are installed
)
echo.

REM Check .env file
echo [4/5] Checking configuration...
if exist ".env" (
    echo [OK] .env file exists
    findstr /C:"TELEGRAM_API_ID" .env >nul
    if %errorlevel% equ 0 (
        echo [OK] Telegram API credentials configured
    ) else (
        echo [WARN] Telegram API credentials missing in .env
    )
) else (
    echo [ERROR] .env file not found
    echo        Copy .env.example to .env and configure it
)
echo.

REM Check session
echo [5/5] Checking authentication...
if exist "session.session" (
    echo [OK] Session file exists (already authenticated)
    echo.
    echo ========================================
    echo   Setup Complete! Ready to use.
    echo ========================================
    echo.
    echo Run: python telegram-scraper.py
) else (
    echo [INFO] No session file (need to authenticate)
    echo.
    echo ========================================
    echo   Setup Complete! Need authentication.
    echo ========================================
    echo.
    echo Run: python telegram-scraper.py
    echo Then scan QR code or enter phone number
)
echo.

:end
pause
