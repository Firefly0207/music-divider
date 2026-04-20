#!/bin/bash
set -e

echo "[Music Divider] 시작 중..."

# 가상환경 생성
if [ ! -d "backend/venv" ]; then
  echo "[1/4] 가상환경 생성..."
  python3 -m venv backend/venv
fi

# 의존성 설치
echo "[2/4] Python 패키지 확인..."
backend/venv/bin/pip install -r backend/requirements.txt -q

# 프론트엔드 의존성
if [ ! -d "frontend/node_modules" ]; then
  echo "[3/4] 프론트엔드 패키지 설치..."
  cd frontend && npm install && cd ..
fi

# 백엔드 백그라운드 실행
echo "[4/4] 서버 시작..."
backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir backend &
BACKEND_PID=$!
sleep 2

# 브라우저 열기 (맥/리눅스)
if command -v open &>/dev/null; then
  open "http://localhost:5173"
elif command -v xdg-open &>/dev/null; then
  xdg-open "http://localhost:5173"
fi

# 프론트엔드 포그라운드
cd frontend && npm run dev

# 종료 시 백엔드도 정리
kill $BACKEND_PID 2>/dev/null
