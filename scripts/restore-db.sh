#!/bin/bash
# ==============================================================================
# INFYPOS Enterprise - Isolated Database Restoration Script
# Conforms to docs/production-readiness/08-backup-restore.md
# ==============================================================================
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path_to_backup.sql.gz> [target_database_name]"
  echo "Example: $0 /var/backups/infypos/infypos_backup_20261102.sql.gz infypos_restore_test"
  exit 1
fi

BACKUP_FILE="$1"
TARGET_DB="${2:-infypos_restore_test}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file not found at ${BACKUP_FILE}"
  exit 1
fi

echo "=================================================="
echo "⚠️  DATABASE RESTORE DRILL"
echo "Source: ${BACKUP_FILE}"
echo "Target DB: ${DB_USER}@${DB_HOST}:${DB_PORT}/${TARGET_DB}"
echo "=================================================="

# Safety check: prevent accidental overwrite of production
if [ "${TARGET_DB}" = "infypos_prod" ] || [ "${TARGET_DB}" = "infypos" ]; then
  echo "⚠️ WARNING: You have specified a production database name (${TARGET_DB})!"
  read -r -p "Type 'CONFIRM_RESTORE' to proceed with overwrite: " CONFIRMATION
  if [ "${CONFIRMATION}" != "CONFIRM_RESTORE" ]; then
    echo "Restore aborted by operator."
    exit 1
  fi
fi

# Recreate target database if testing
echo "🛠️ Creating target database if it does not exist..."
createdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${TARGET_DB}" 2>/dev/null || true

echo "🔄 Restoring database from compressed dump..."
gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" > /dev/null

echo "✅ Restoration completed successfully."
echo "🔍 Running verification integrity checks..."

psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -c "
  SELECT 'Tenants count' as check_item, COUNT(*) as result FROM tenants
  UNION ALL
  SELECT 'Products count', COUNT(*) FROM products
  UNION ALL
  SELECT 'Users count', COUNT(*) FROM users
  UNION ALL
  SELECT 'Completed sales count', COUNT(*) FROM sales WHERE status = 'COMPLETED';
"

echo "🎉 Database restore and verification completed successfully!"
