#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=${AMDA_FLASK_PORT:-5000}
SIM_PORT=3000
FRONTEND_PORT=5173

cleanup() {
    echo ""
    echo "Shutting down all services..."
    kill $BACKEND_PID $SIM_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $SIM_PID $FRONTEND_PID 2>/dev/null
    echo "All services stopped."
}
trap cleanup EXIT INT TERM

echo "=== AMDA — Autonomous Maintenance Decision Agent ==="
echo ""

# ---- Backend (uv venv) ----
cd "$ROOT/backend"
echo "[1/3] Starting Backend (uv venv) on port $BACKEND_PORT ..."
uv run python3 server.py &
BACKEND_PID=$!

# ---- Simulator ----
cd "$ROOT/simulator"
if [ ! -d node_modules ]; then
    echo "[...] Installing simulator dependencies ..."
    npm install --silent
fi
echo "[2/3] Starting Simulator on port $SIM_PORT ..."
npm start &
SIM_PID=$!

# ---- Frontend ----
cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
    echo "[...] Installing frontend dependencies ..."
    npm install --silent
fi
echo "[3/3] Starting Frontend on port $FRONTEND_PORT ..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=== All services started ==="
echo "  Backend:   http://localhost:$BACKEND_PORT"
echo "  Simulator: http://localhost:$SIM_PORT"
echo "  Frontend:  http://localhost:$FRONTEND_PORT"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

wait
