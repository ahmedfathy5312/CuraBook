#!/bin/bash
set -e

echo "========================================"
echo " CuraBook — Container Startup"
echo "========================================"

echo "⏳ Waiting for PostgreSQL..."
while ! python -c "
import os, psycopg2
psycopg2.connect(
    dbname=os.environ['DB_NAME'],
    user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD'],
    host=os.environ.get('DB_HOST', 'db'),
    port=os.environ.get('DB_PORT', '5432')
)
" 2>/dev/null; do
    echo "  → DB not ready, retrying in 1s..."
    sleep 1
done
echo "✅ PostgreSQL is ready"

echo "⏳ Waiting for Redis..."
while ! python -c "
import os, redis
r = redis.Redis(
    host=os.environ.get('REDIS_HOST', 'redis'),
    port=int(os.environ.get('REDIS_PORT', '6379')),
    password=os.environ.get('REDIS_PASSWORD') or None
)
r.ping()
" 2>/dev/null; do
    echo "  → Redis not ready, retrying in 1s..."
    sleep 1
done
echo "✅ Redis is ready"

if [ "${SKIP_MIGRATE}" = "true" ]; then
    echo "⏭  SKIP_MIGRATE=true — skipping migrations (web service handles this)"
else
    echo "🔄 Running database migrations..."
    python manage.py migrate --noinput

    echo "🌍 Seeding Egypt cities (skips if already seeded)..."
    python manage.py seed_egypt_cities

    echo "📦 Collecting static files..."
    python manage.py collectstatic --noinput --clear
fi

echo "🚀 Starting service: $@"
exec "$@"
