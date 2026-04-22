#!/bin/bash
# =============================================================================
# MAELLIS Airport Bot — Database Restore Script
# Usage: ./scripts/restore-db.sh <backup_file.sql.gz>
# =============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "❌ Usage: $0 <backup_file.sql.gz>"
    echo "   Available backups:"
    ls -lht /backups/maellis_backup_*.sql.gz 2>/dev/null | head -5 || echo "   (none found)"
    exit 1
fi

BACKUP_FILE="$1"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-maellis}"
DB_NAME="${DB_NAME:-maellis_db}"
DB_PASSWORD="${DB_PASSWORD:-maellis_secret_2024}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will REPLACE the current database!"
echo "   Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "   Backup: ${BACKUP_FILE}"
read -p "   Type 'YES' to continue: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

echo "📦 Starting database restore at $(date)"

# Restore backup
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --quiet \
    --set ON_ERROR_STOP=on

echo "✅ Database restored successfully at $(date)"
