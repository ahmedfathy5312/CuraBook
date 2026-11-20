"""
CuraBook — Health Selectors
============================
Infrastructure health checks — used by views.
Each selector returns a dict with status + latency_ms.
"""

import time
import logging

logger = logging.getLogger("curabook.health")


def check_database() -> dict:
    from django.db import connection
    start = time.monotonic()
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return {"status": "ok", "latency_ms": round((time.monotonic() - start) * 1000, 2)}
    except Exception as e:
        logger.error(f"[Health] DB check failed: {e}")
        return {"status": "error", "error": str(e)}


def check_redis() -> dict:
    from django.core.cache import cache
    start = time.monotonic()
    try:
        key = "_health_ping"
        cache.set(key, "pong", timeout=5)
        val = cache.get(key)
        if val != "pong":
            raise ValueError("Cache read mismatch")
        return {"status": "ok", "latency_ms": round((time.monotonic() - start) * 1000, 2)}
    except Exception as e:
        logger.error(f"[Health] Redis check failed: {e}")
        return {"status": "error", "error": str(e)}


def check_celery() -> dict:
    start = time.monotonic()
    try:
        from curabook.celery import app
        inspect = app.control.inspect(timeout=2)
        active = inspect.active()
        if active is None:
            return {"status": "warning", "message": "No workers responded", "latency_ms": round((time.monotonic() - start) * 1000, 2)}
        return {"status": "ok", "workers": len(active), "latency_ms": round((time.monotonic() - start) * 1000, 2)}
    except Exception as e:
        logger.warning(f"[Health] Celery check failed: {e}")
        return {"status": "warning", "error": str(e)}
