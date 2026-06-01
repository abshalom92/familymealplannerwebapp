#!/bin/bash
# Family Meal Planner - Start Script
# Usage:
#   ./start.sh          — dev mode (hot-reload, http://localhost:5173)
#   ./start.sh --prod   — prod mode (built app, offline-capable PWA, http://localhost:4173)
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="dev"

if [[ "$1" == "--prod" ]]; then
  MODE="prod"
fi

echo "Starting Family Meal Planner ($MODE mode)..."

# Start backend
source "$PROJECT_DIR/venv/bin/activate"
cd "$PROJECT_DIR/backend"

if [[ "$MODE" == "prod" ]]; then
  echo "Starting backend (FastAPI) on http://localhost:8000 ..."
  uvicorn app.main:app --host 0.0.0.0 --port 8000 &
else
  echo "Starting backend (FastAPI) on http://localhost:8000 ..."
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
fi
BACKEND_PID=$!

cd "$PROJECT_DIR/frontend"

if [[ "$MODE" == "prod" ]]; then
  echo "Building frontend..."
  npm run build
  echo "Serving production build on http://localhost:4173 ..."
  npm run preview &
  FRONTEND_PID=$!
  FRONTEND_URL="http://localhost:4173"
else
  echo "Starting frontend (Vite dev) on http://localhost:5173 ..."
  npm run dev &
  FRONTEND_PID=$!
  FRONTEND_URL="http://localhost:5173"
fi

echo ""
echo "App running in $MODE mode!"
echo "   Frontend:    $FRONTEND_URL"
echo "   Backend API: http://localhost:8000"
echo "   API Docs:    http://localhost:8000/docs"

if [[ "$MODE" == "prod" ]]; then
  echo ""
  echo "   PWA offline support is active."
  echo "   Visit $FRONTEND_URL once to let the service worker cache the app."
  echo "   After that first visit, the app works offline even after a reboot."
fi

echo ""
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
