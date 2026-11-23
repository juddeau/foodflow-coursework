#!/usr/bin/env bash
# Развёртывание в Kubernetes из Docker Desktop (Settings -> Kubernetes -> Enable).
# Образы собираются локально, кластер Docker Desktop видит их без реестра.
set -euo pipefail
cd "$(dirname "$0")/.."

for s in users restaurants orders delivery; do
  docker build -t foodflow/$s-service:latest services/$s-service
done
docker build -t foodflow/gateway:latest gateway
docker build -t foodflow/client:latest client

kubectl apply -f k8s/
kubectl -n foodflow rollout status deployment/gateway --timeout=300s
echo "Готово: http://localhost:30080"
