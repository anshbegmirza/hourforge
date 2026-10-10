#!/usr/bin/env bash
# Start backend + frontend for local testing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() {
  echo ""
  echo "Stopping..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting backend (http://localhost:3000)..."
(cd "$ROOT/backend" && npm run dev) &
BACKEND_PID=$!

echo "Starting frontend (http://localhost:4200)..."
(cd "$ROOT/frontend" && npm start) &
FRONTEND_PID=$!

echo "Both running. Ctrl+C to stop."
wait
