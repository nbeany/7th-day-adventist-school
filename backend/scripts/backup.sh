#!/bin/sh
# Dumps the database to a timestamped, gzipped file and deletes dumps older
# than BACKUP_RETENTION_DAYS. Meant to be run inside the `backup` service
# from docker-compose.prod.yml (see backup-loop.sh), or manually:
#   docker compose -f docker-compose.prod.yml exec backup /scripts/backup.sh
set -eu

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/${POSTGRES_NAME}_${TIMESTAMP}.sql.gz"

echo "Backing up ${POSTGRES_NAME}@${POSTGRES_HOST} -> ${BACKUP_FILE}"
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" "$POSTGRES_NAME" | gzip > "$BACKUP_FILE"
echo "Backup complete: $(du -h "$BACKUP_FILE" | cut -f1)"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
find /backups -name "${POSTGRES_NAME}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "Pruned backups older than ${RETENTION_DAYS} days."
