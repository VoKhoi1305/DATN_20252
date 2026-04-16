#!/usr/bin/env bash
# ============================================================
# SMTTS — fast update after pulling new code
# Use when CI is NOT set up: builds + restarts only changed services.
# Usage:  bash code/docker/scripts/update.sh [backend|web|face|all]
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."   # → code/docker

TARGET="${1:-all}"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

echo "==> Pulling latest source"
git -C ../.. pull --ff-only

case "$TARGET" in
  backend)
    $COMPOSE build backend
    $COMPOSE up -d --no-deps backend
    ;;
  web)
    $COMPOSE build web
    $COMPOSE up -d --no-deps web
    ;;
  face)
    $COMPOSE build face-recognition
    $COMPOSE up -d --no-deps face-recognition
    ;;
  all)
    $COMPOSE build
    $COMPOSE up -d
    ;;
  *)
    echo "Unknown target: $TARGET (use: backend|web|face|all)"
    exit 1
    ;;
esac

echo "==> Pruning dangling images"
docker image prune -f

echo "Update done. Status:"
$COMPOSE ps
