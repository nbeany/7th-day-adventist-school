#!/bin/sh
# Entrypoint for the `backup` service: runs backup.sh once immediately (so
# a fresh deploy has a backup right away), then repeats on
# BACKUP_INTERVAL_SECONDS (default: once a day).
set -eu

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"

while true; do
  sh /scripts/backup.sh
  sleep "$INTERVAL"
done
