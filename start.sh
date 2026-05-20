#!/bin/bash
# Family Meal Planner - Start Script
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🥗 Starting Family Meal Planner..."

# Start backend
echo "🔧 Starting backend (FastAPI) on http://localhost:8000 ..."
source "$PROJECT_DIR/venv/bin/activate"
cd "$PROJECT_DIR/backend"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
echo "⚛️  Starting frontend (React) on http://localhost:5173 ..."
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ App running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo "   API Docs:    http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
