#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

cleanup() {
  echo
  echo "Stopping Agent server..."
  kill 0
}
trap cleanup INT TERM

pnpm --filter @pr_hospitalagent/agent dev &
AGENT_PID=$!

echo "Agent (pid $AGENT_PID) → http://localhost:3002"
echo "Press Ctrl+C to stop."

wait
