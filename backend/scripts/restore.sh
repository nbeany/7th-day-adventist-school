#!/bin/sh
# Restores a backup produced by backup.sh, OVERWRITING the current database.
# Run from the host (not inside a container), e.g.:
#   docker compose -f docker-compose.prod.yml exec backup \
#     /scripts/restore.sh /backups/school_db_20260901_020000.sql.gz
#
# This is destructive on purpose - it drops every table currently in the
# database before restoring. Only run it when you mean it.
set -eu

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: restore.sh /backups/<file>.sql.gz"
  echo "Available backups:"
  ls -la /backups/*.sql.gz 2>/dev/null || echo "  (none found in /backups)"
  exit 1
fi

echo "This will PERMANENTLY REPLACE the contents of database '${POSTGRES_NAME}' on ${POSTGRES_HOST}"
echo "with the contents of: ${BACKUP_FILE}"
printf "Type 'yes' to continue: "
read -r CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" "$POSTGRES_NAME"
echo "Restore complete."
