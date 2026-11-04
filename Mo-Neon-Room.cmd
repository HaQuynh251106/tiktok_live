@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found.
  echo Install Node.js 20 or newer from https://nodejs.org then run this file again.
  echo Extract the entire ZIP before starting the game.
  pause
  exit /b 1
)
node -e "if (Number(process.versions.node.split('.')[0]) < 20) process.exit(1)" >nul 2>&1
if errorlevel 1 (
  echo This game needs Node.js 20 or newer. Update Node.js and try again.
  pause
  exit /b 1
)
node server.mjs --open %*
if errorlevel 1 (
  echo.
  echo The room could not start. Check the error message above.
  echo If port 8790 is already in use, close the previous room first.
  pause
  exit /b 1
)
endlocal
