#!/usr/bin/env bash
set -e

echo "=============================================="
echo "  InterviewIQ Backend — Starting up"
echo "=============================================="

echo "[entrypoint] Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."

until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}"; do
  echo "[entrypoint] PostgreSQL is not ready yet — sleeping 2s"
  sleep 2
done

echo "[entrypoint] PostgreSQL is ready."

echo "[entrypoint] Running database migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput --clear

# IMPORTANT: This app uses Django Channels (WebSockets for the live interview).
# It MUST be served by an ASGI server. Gunicorn on core.wsgi is WSGI-only and
# cannot perform the WebSocket upgrade, which makes /ws/interview/... fail.
# Daphne serves both HTTP and WebSocket from the single ASGI application.
echo "[entrypoint] Starting Daphne (ASGI — HTTP + WebSocket)..."
exec daphne -b 0.0.0.0 -p 8000 --access-log - core.asgi:application
