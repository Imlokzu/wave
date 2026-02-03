@echo off
echo ========================================
echo   Fixing Feed Bot Dependencies
echo ========================================
echo.

echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo.
echo Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Installing/updating dependencies...
pip install -r requirements.txt

echo.
echo ========================================
echo   Dependencies Fixed!
echo ========================================
echo.
echo You can now run: python telegram-scraper.py
echo.

pause
