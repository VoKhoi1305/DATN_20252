#!/usr/bin/env bash
# ============================================================
# SMTTS — Save built images to a single tar.gz for offline transfer
# Run on your DEV machine after building the 3 images locally.
#
# Tags local images as "local/smtts-<service>:<tag>" so they match
# what docker-compose.prod.yml expects when REGISTRY_PREFIX=local.
#
# Usage:
#   bash code/docker/scripts/save-images.sh [tag]
#
# Output:
#   code/docker/dist/smtts-images-<tag>.tar.gz
# ============================================================
set -euo pipefail

TAG="${1:-latest}"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/dist"
mkdir -p "$OUT_DIR"

OUT_FILE="$OUT_DIR/smtts-images-$TAG.tar.gz"

# Source images (built locally with `docker build -t smtts-<x>:<tag>`)
declare -A SOURCE_TO_TARGET=(
  ["smtts-backend:$TAG"]="local/smtts-backend:$TAG"
  ["smtts-web:$TAG"]="local/smtts-web:$TAG"
  ["smtts-face:$TAG"]="local/smtts-face:$TAG"
)

echo "==> Verifying source images exist locally"
TARGETS=()
for src in "${!SOURCE_TO_TARGET[@]}"; do
  if ! docker image inspect "$src" >/dev/null 2>&1; then
    echo "ERROR: image '$src' not found. Build it first, e.g.:"
    echo "  docker build -t smtts-backend:$TAG -f code/backend/Dockerfile code/backend"
    exit 1
  fi
  size=$(docker image inspect "$src" --format '{{.Size}}' | awk '{printf "%.0f MB", $1/1024/1024}')
  echo "  $src  ($size)"
done

echo
echo "==> Re-tagging with 'local/' prefix to match compose template"
for src in "${!SOURCE_TO_TARGET[@]}"; do
  tgt="${SOURCE_TO_TARGET[$src]}"
  docker tag "$src" "$tgt"
  TARGETS+=("$tgt")
  echo "  $src  →  $tgt"
done

echo
echo "==> Saving to $OUT_FILE (this can take a few minutes; ~1 GB compressed)"
docker save "${TARGETS[@]}" | gzip -c > "$OUT_FILE"

echo
echo "==> Done"
ls -lh "$OUT_FILE"
echo
echo "Next step — copy to server (run from your dev machine):"
echo "  scp \"$OUT_FILE\" smtts@<server-ip>:/opt/smtts/code/docker/dist/"
echo
echo "Then SSH to server and run:"
echo "  bash /opt/smtts/code/docker/scripts/load-images.sh $TAG"
