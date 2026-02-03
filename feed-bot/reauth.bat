@echo off
echo ========================================
echo   Telegram Feed Bot - Re-Authentication
echo ========================================
echo.

REM Delete old session
if exist "session.session" (
    echo Deleting old session file...
    del session.session
    echo Old session deleted!
    echo.
)

if exist "session.session-journal" (
    del session.session-journal
)

echo Starting authentication process...
echo.
echo You will need to:
echo   1. Scan the QR code with your Telegram app, OR
echo   2. Enter your phone number and verification code
echo.

REM Activate venv and run
call .venv\Scripts\activate.bat
python telegram-scraper.py

pause
