#!/usr/bin/env bash
# ============================================================
# SMTTS — Load offline-built images on the server
# Run on the SERVER, after scp'ing the tar.gz from dev machine.
#
# Usage:
#   bash code/docker/scripts/load-images.sh [tag]
#
# Expects:  code/docker/dist/smtts-images-<tag>.tar.gz
# Sets compose to use:  local/smtts-<service>:<tag>
# ============================================================
set -euo pipefail

TAG="${1:-latest}"
DOCKER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$DOCKER_DIR/dist"
IN_FILE="$DIST_DIR/smtts-images-$TAG.tar.gz"

if [[ ! -f "$IN_FILE" ]]; then
  echo "ERROR: $IN_FILE not found."
  echo "Copy it from your dev machine first, e.g.:"
  echo "  scp dist/smtts-images-$TAG.tar.gz smtts@<server>:$DIST_DIR/"
  exit 1
fi

echo "==> Loading images from $(ls -lh "$IN_FILE" | awk '{print $5, $9}')"
gunzip -c "$IN_FILE" | docker load

echo
echo "==> Loaded images:"
docker images | grep -E "local/smtts-(backend|web|face)" || true

# Make sure compose will use these images, not pull from a registry.
ENV_FILE="$DOCKER_DIR/.env.prod"
if [[ -f "$ENV_FILE" ]]; then
  if grep -q '^REGISTRY_PREFIX=' "$ENV_FILE"; then
    sed -i.bak 's|^REGISTRY_PREFIX=.*|REGISTRY_PREFIX=local|' "$ENV_FILE"
  else
    echo "REGISTRY_PREFIX=local" >> "$ENV_FILE"
  fi
  if grep -q '^IMAGE_TAG=' "$ENV_FILE"; then
    sed -i.bak "s|^IMAGE_TAG=.*|IMAGE_TAG=$TAG|" "$ENV_FILE"
  else
    echo "IMAGE_TAG=$TAG" >> "$ENV_FILE"
  fi
  rm -f "$ENV_FILE.bak"
  echo
  echo "==> Updated $ENV_FILE  →  REGISTRY_PREFIX=local, IMAGE_TAG=$TAG"
else
  echo
  echo "WARNING: $ENV_FILE not found. Create it from .env.prod.example first."
fi

echo
echo "Next step — start (or roll) the stack:"
echo "  cd $DOCKER_DIR"
echo "  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d"
