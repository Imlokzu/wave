@echo off
echo ========================================
echo Restarting Wave with Hallucination Fix
echo ========================================
echo.

echo Step 1: Building TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo Build successful!
echo.

echo Step 2: Stopping any running servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.

echo Step 3: Starting server with new code...
echo.
echo ========================================
echo Server starting on port 3001
echo ========================================
echo.
echo The AI will now fetch FULL CONTENT from search results!
echo.
echo Test it by asking:
echo "Compare Honor Magic 6 Pro vs OnePlus Ace 5 Pro specs"
echo.
echo Watch the console for:
echo [DeepSeek] Searching with full content for: "..."
echo [Search] Fetching content from: https://...
echo [Search] Extracted XXXX characters from https://...
echo.
echo ========================================
echo.

npm start
