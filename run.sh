#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

cleanup() {
  echo
  echo "Stopping dev servers..."
  kill 0
}
trap cleanup INT TERM

echo "Starting MongoDB (docker compose)..."
docker compose up -d mongodb

pnpm --filter @pr_hospitalagent/api dev &
API_PID=$!

pnpm --filter @pr_hospitalagent/web dev &
WEB_PID=$!

echo "API   (pid $API_PID) → http://localhost:3001"
echo "Web   (pid $WEB_PID) → http://localhost:3000"
echo "Press Ctrl+C to stop both."

wait
