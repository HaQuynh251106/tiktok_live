@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Chua tim thay Node.js. Cai Node.js 24 LTS tu https://nodejs.org
  echo Giai nen toan bo thu muc ZIP truoc khi chay.
  pause
  exit /b 1
)
node -e "if (Number(process.versions.node.split('.')[0]) < 22) process.exit(1)" >nul 2>&1
if errorlevel 1 (
  echo Can Node.js 22 tro len. Hay cai Node.js 24 LTS va chay lai.
  pause
  exit /b 1
)
node -e "if(require('tiktok-live-connector/package.json').version!=='2.5.0')process.exit(1)" >nul 2>&1
if errorlevel 1 (
  echo Dang cai bo ket noi TikTok lan dau. Can Internet, vui long doi...
  call npm.cmd ci --ignore-scripts --no-audit --no-fund
  if errorlevel 1 (
    echo Chua cai duoc thu vien. Kiem tra Internet va chay lai.
    pause
    exit /b 1
  )
)
node server.mjs --open %*
if errorlevel 1 (
  echo Chua mo duoc game. Xem loi phia tren. Neu cong 8790 dang dung, mo lai trang admin.
  pause
  exit /b 1
)
endlocal
