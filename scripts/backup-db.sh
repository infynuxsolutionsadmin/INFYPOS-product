#!/bin/bash
# ==============================================================================
# INFYPOS Enterprise - Automated PostgreSQL Backup Script
# Conforms to docs/production-readiness/08-backup-restore.md
# ==============================================================================
set -euo pipefail

# Configuration with defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-infypos}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/infypos}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/infypos_${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "=================================================="
echo "🕒 Starting INFYPOS database backup at $(date)"
echo "Target DB: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "=================================================="

mkdir -p "${BACKUP_DIR}"

# Execute compressed streaming pg_dump
if [ -n "${PGPASSWORD:-}" ]; then
  export PGPASSWORD
fi

echo "📦 Dumping and compressing database schema & data..."
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-privileges | gzip -9 > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ Backup successfully created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Upload to S3 if bucket is specified
if [ -n "${S3_BUCKET}" ]; then
  echo "☁️ Uploading backup to S3 bucket: s3://${S3_BUCKET}/db-backups/..."
  aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/db-backups/infypos_${DB_NAME}_${TIMESTAMP}.sql.gz" --sse aws:kms
  echo "✅ S3 upload complete."
fi

# Clean up local backups older than retention policy
echo "🧹 Purging local backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "infypos_${DB_NAME}_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete || true

echo "🎉 Backup workflow completed successfully at $(date)"
