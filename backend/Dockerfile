# ─────────────────────────────────────────────────────────────────────────────
# CuraBook — Backend Dockerfile (Multi-stage)
# Context: ./backend  (set in docker-compose.yml build.context)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build Python wheels ─────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# System deps for psycopg2 + argon2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=curabook.settings.dev
    # ✅ Safe default — prod settings are set via docker-compose env_file / environment

WORKDIR /app

# Runtime libs only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install from pre-built wheels (faster, no compiler needed)
COPY --from=builder /wheels /wheels
RUN pip install --no-index --find-links=/wheels /wheels/* && rm -rf /wheels

# Copy project source
COPY . .

# Create non-root user for security
RUN addgroup --system cura \
    && adduser --system --ingroup cura cura \
    && mkdir -p /app/logs /app/media /app/staticfiles /app/certs \
    && chown -R cura:cura /app \
    && chmod 600 /app/certs/*.pem 2>/dev/null || true

# Entrypoint must be copied and owned before switching to non-root user
COPY docker/entrypoint.sh /entrypoint.sh
RUN chown cura:cura /entrypoint.sh && chmod +x /entrypoint.sh

USER cura

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]

# Default command: web service (Daphne). Celery services override this via docker-compose.
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "--access-log", "-", "curabook.asgi:application"]
