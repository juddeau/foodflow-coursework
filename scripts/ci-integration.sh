#!/usr/bin/env bash
set -euo pipefail
mkdir -p .test-logs
service_pids=()
cleanup() { for service_pid in "${service_pids[@]}"; do kill "$service_pid" 2>/dev/null || true; done; }
trap cleanup EXIT
export NATS_URL="${NATS_URL:-nats://127.0.0.1:4222}"
export RESTAURANTS_URL=http://127.0.0.1:4002/graphql
port=4001
for component in users restaurants orders delivery; do
  PORT="$port" MONGO_URI="mongodb://127.0.0.1:27017/${component}_db" node "services/$component-service/dist/index.js" > ".test-logs/$component.log" 2>&1 &
  service_pids+=("$!")
  port=$((port + 1))
done
PORT=4000 USERS_URL=http://127.0.0.1:4001/graphql RESTAURANTS_URL=http://127.0.0.1:4002/graphql ORDERS_URL=http://127.0.0.1:4003/graphql DELIVERY_URL=http://127.0.0.1:4004/graphql node gateway/dist/index.js > .test-logs/gateway.log 2>&1 &
service_pids+=("$!")
for port in 4000 4001 4002 4003 4004; do
  ready=false
  for attempt in {1..60}; do
    if curl --fail --silent -X POST "http://127.0.0.1:$port/" -H 'content-type: application/json' -d '{"query":"{__typename}"}' >/dev/null; then ready=true; break; fi
    sleep 1
  done
  if [[ "$ready" != true ]]; then cat .test-logs/*.log; exit 1; fi
done
export GATEWAY_URL=http://127.0.0.1:4000/
node scripts/e2e.mjs
node scripts/api-checks.mjs
