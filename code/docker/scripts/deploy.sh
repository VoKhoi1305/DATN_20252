#!/usr/bin/env bash
# ============================================================
# SMTTS — first-time deploy on a fresh server
# Builds all images locally and starts the stack.
# Run from repo root:  bash code/docker/scripts/deploy.sh
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."   # → code/docker

if [[ ! -f .env.prod ]]; then
  echo "ERROR: .env.prod not found in $(pwd)"
  echo "Copy .env.prod.example to .env.prod and fill in real secrets first."
  exit 1
fi

echo "==> Building images (first run can take ~10 minutes for face-recognition)"
docker compose -f docker-compose.prod.yml --env-file .env.prod build

echo "==> Starting stack"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "==> Waiting for services to become healthy..."
sleep 10
docker compose -f docker-compose.prod.yml --env-file .env.prod ps

echo
echo "Deploy done. Open http://<server-ip> in a browser."
echo "Logs:  docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f"
