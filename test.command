#!/bin/bash
# Двойной клик: состояние контейнеров и сквозной тест (система должна быть запущена)
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"
clear
docker compose ps --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}'
echo
docker run --rm --network food-delivery_default -v "$PWD/scripts:/s" node:22-alpine node /s/e2e.mjs 2>&1 | tee test-log.txt
