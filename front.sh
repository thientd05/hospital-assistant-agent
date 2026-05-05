#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

cleanup() {
  echo
  echo "Stopping web server..."
  kill 0
}
trap cleanup INT TERM

pnpm --filter @pr_hospitalagent/web dev &
WEB_PID=$!

echo "Web   (pid $WEB_PID) → http://localhost:3000"
echo "Press Ctrl+C to stop."

wait
