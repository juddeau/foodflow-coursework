#!/bin/bash
# Двойной клик: собрать и запустить систему, затем прогнать сквозной тест.
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"
LOG=run-log.txt
{
  echo "=== $(date) ==="
  if ! docker info >/dev/null 2>&1; then
    echo "Docker не запущен, открываю Docker Desktop..."
    open -a Docker || open -a "Docker Desktop" || true
    for i in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 3; done
  fi
  docker version --format 'Docker {{.Server.Version}}' || { echo "Docker так и не запустился"; exit 1; }
  docker compose up --build -d
  echo "--- ждём старта шлюза"
  for i in $(seq 1 60); do
    curl -s -o /dev/null -X POST localhost:4000/ -H 'content-type: application/json' -d '{"query":"{__typename}"}' && break
    sleep 3
  done
  docker compose ps
  echo "--- сквозной тест"
  docker run --rm --network food-delivery_default -v "$PWD/scripts:/s" node:22-alpine node /s/e2e.mjs
  echo "--- логи сервисов"
  docker compose logs --tail=40
  echo "=== ГОТОВО ==="
} 2>&1 | tee "$LOG"
echo "Клиент: http://localhost:8080"
