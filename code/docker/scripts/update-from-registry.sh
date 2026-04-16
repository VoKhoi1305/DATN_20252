#!/usr/bin/env bash
# ============================================================
# SMTTS — fast update from container registry (CI workflow)
# Use when CI builds images and pushes to GHCR.
# Pulls the new images and rolls the containers — no local build.
# Usage:  bash code/docker/scripts/update-from-registry.sh [tag]
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."   # → code/docker

TAG="${1:-latest}"
export IMAGE_TAG="$TAG"

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

echo "==> Pulling images at tag: $TAG"
$COMPOSE pull

echo "==> Rolling containers"
$COMPOSE up -d --remove-orphans

echo "==> Pruning old images"
docker image prune -f

echo "Update done. Status:"
$COMPOSE ps
