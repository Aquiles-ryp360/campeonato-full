#!/bin/bash
set -euo pipefail

###############################################################################
# Database backup script
# Usage: bash scripts/backup.sh [--upload]
#   --upload   Upload backup to remote storage (S3-compatible)
#
# Dependencies: pg_dump, gzip, aws CLI (for --upload)
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_NAME="${DB_NAME:-campeonato}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
UPLOAD="${1:-}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/campeonato_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

export PGPASSWORD="$DB_PASSWORD"

# ------------------------------------------------------------------
# Dump & compress
# ------------------------------------------------------------------
log_info "Dumping database ${DB_NAME}@${DB_HOST}:${DB_PORT}..."
pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --no-owner \
  --no-acl \
  --verbose \
  2>/dev/null | gzip > "$BACKUP_FILE"

log_ok "Backup saved: ${BACKUP_FILE}"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_info "Backup size: ${FILESIZE}"

# ------------------------------------------------------------------
# Rotate old backups (keep last $RETENTION_DAYS days)
# ------------------------------------------------------------------
log_info "Rotating backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "campeonato_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete
REMAINING=$(find "$BACKUP_DIR" -name "campeonato_*.sql.gz" -type f | wc -l)
log_ok "Retention applied — ${REMAINING} backup(s) kept"

# ------------------------------------------------------------------
# Optional: upload to remote storage (S3-compatible)
# ------------------------------------------------------------------
if [ "$UPLOAD" == "--upload" ]; then
  S3_BUCKET="${S3_BUCKET:-s3://campeonato-backups}"
  S3_PATH="${S3_BUCKET}/postgres/${TIMESTAMP}/"

  if command -v aws &> /dev/null; then
    log_info "Uploading to ${S3_PATH}..."
    aws s3 cp "$BACKUP_FILE" "$S3_PATH" --only-show-errors
    log_ok "Upload complete"
  else
    log_warn "aws CLI not found, skipping upload"
  fi
fi

unset PGPASSWORD

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Backup completed successfully${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  ${CYAN}File:${NC}  ${BACKUP_FILE}"
echo -e "  ${CYAN}Size:${NC}  ${FILESIZE}"
echo ""
