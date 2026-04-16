#!/usr/bin/env bash
# ============================================================
# SMTTS — dump both Postgres databases to ./backups/
# Run on the server. Add to crontab for daily backups.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."   # → code/docker

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"

# Load env so we know the user/db names
set -a; . ./.env.prod; set +a

echo "==> Dumping smtts_main"
docker exec smtts-postgres-main \
  pg_dump -U "${DB_MAIN_USER:-smtts_user}" -d "${DB_MAIN_NAME:-smtts_main}" \
  | gzip > "$BACKUP_DIR/main_${STAMP}.sql.gz"

echo "==> Dumping smtts_biometric"
docker exec smtts-postgres-biometric \
  pg_dump -U "${DB_BIO_USER:-smtts_bio_user}" -d "${DB_BIO_NAME:-smtts_biometric}" \
  | gzip > "$BACKUP_DIR/biometric_${STAMP}.sql.gz"

# Keep only the last 14 backups per database
ls -1t "$BACKUP_DIR"/main_*.sql.gz       | tail -n +15 | xargs -r rm -f
ls -1t "$BACKUP_DIR"/biometric_*.sql.gz  | tail -n +15 | xargs -r rm -f

echo "Backups written to $BACKUP_DIR"
ls -lh "$BACKUP_DIR" | tail -n 5
