#!/bin/sh
set -e

echo "Waiting for database at ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."
until nc -z "${POSTGRES_HOST:-db}" "${POSTGRES_PORT:-5432}"; do
  sleep 1
done
echo "Database is up."

python manage.py migrate --noinput

if [ "$DJANGO_DEBUG" != "True" ]; then
  python manage.py collectstatic --noinput
fi

exec "$@"
