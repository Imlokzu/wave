@echo off
echo ========================================
echo  Wave Messenger - Frontend/Backend Split
echo ========================================
echo.

echo Creating backup...
xcopy /E /I /Y . ..\wave-backup
echo Backup created in ..\wave-backup
echo.

echo Moving FRONTEND files...
xcopy /E /I /Y public\* frontend\
xcopy /E /I /Y admin\public\* frontend\admin\
echo Frontend files moved!
echo.

echo Moving BACKEND files...
xcopy /E /I /Y src\* backend\src\
xcopy /E /I /Y migrations\* backend\migrations\
xcopy /E /I /Y feed-bot\* backend\feed-bot\
xcopy /Y package.json backend\
xcopy /Y package-lock.json backend\
xcopy /Y tsconfig.json backend\
xcopy /Y jest.config.js backend\
xcopy /Y .env backend\
xcopy /Y *.sql backend\
echo Backend files moved!
echo.
echo NOTE: node_modules NOT copied - run 'npm install' in backend folder
echo.

echo ========================================
echo  Files moved successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Run: node update-frontend-files.js
echo 2. Test locally
echo 3. Deploy!
echo.
pause
