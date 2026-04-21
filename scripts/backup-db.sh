#!/bin/bash
# =============================================================================
# MAELLIS Airport Bot — PostgreSQL Backup Script
# Run daily via cron: 0 2 * * * /app/scripts/backup-db.sh
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-maellis}"
DB_NAME="${DB_NAME:-maellis_db}"
DB_PASSWORD="${DB_PASSWORD:-maellis_secret_2024}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/maellis_backup_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📦 Starting database backup at $(date)"
echo "   Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"

# Perform backup
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    | gzip > "$BACKUP_FILE"

# Check backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup completed: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Clean old backups (keep last N days)
DELETED=$(find "$BACKUP_DIR" -name "maellis_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "🗑️  Cleaned ${DELETED} old backup(s) (older than ${RETENTION_DAYS} days)"
fi

# Verify backup integrity
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "✅ Backup integrity verified"
else
    echo "❌ WARNING: Backup integrity check failed!"
    exit 1
fi

echo "🎉 Backup process finished at $(date)"
