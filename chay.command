#!/bin/bash
cd "$(dirname "$0")" || exit 1
export PATH="$PWD/.runtime/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
fail() { echo; echo "$1"; read -r -p "Nhấn Enter để đóng cửa sổ…"; exit 1; }
echo "NEON ROOM · Sàn nhảy TikTok LIVE"
if ! command -v node >/dev/null 2>&1; then
  open https://nodejs.org/en/download/
  fail "Hãy cài Node.js 24 LTS, rồi nháy đúp chay.command lần nữa."
fi
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)" || fail "Cần Node.js 22 trở lên. Hãy cài Node.js 24 LTS từ nodejs.org rồi chạy lại."
if ! node -e "if(require('tiktok-live-connector/package.json').version!=='2.5.0')process.exit(1)" >/dev/null 2>&1; then
  echo "Đang cài bộ kết nối TikTok lần đầu. Cần Internet, vui lòng đợi…"
  npm ci --ignore-scripts --no-audit --no-fund || fail "Chưa cài được thư viện. Kiểm tra Internet và chạy lại."
fi
node server.mjs --open "$@"
result=$?
if [ "$result" -ne 0 ]; then fail "Chưa mở được game. Xem lỗi phía trên. Nếu cổng đang dùng, mở lại trang admin đang chạy."; fi
