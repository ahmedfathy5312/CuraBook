"""
CuraBook — Health Check Endpoints
====================================
Production monitoring endpoints for all infrastructure components.

Endpoints:
    GET /api/v1/health/          → overall system health
    GET /api/v1/health/db/       → PostgreSQL connectivity
    GET /api/v1/health/redis/    → Redis connectivity
    GET /api/v1/health/celery/   → Celery worker availability

Usage:
    - Load balancer health checks
    - Uptime monitoring (PagerDuty, Datadog, etc.)
    - Admin dashboard status page
"""

import time
import logging
from django.http import JsonResponse
from django.views import View
from django.db import connection
from django.core.cache import cache

logger = logging.getLogger('curabook')


def _json_ok(component: str, latency_ms: float = None) -> dict:
    result = {"status": "ok", "component": component}
    if latency_ms is not None:
        result["latency_ms"] = round(latency_ms, 2)
    return result


def _json_fail(component: str, error: str) -> dict:
    return {"status": "fail", "component": component, "error": error}


class HealthView(View):
    """
    GET /api/v1/health/
    Overall system health — checks all components.
    Returns 200 if all healthy, 503 if any critical component is down.
    """

    def get(self, request):
        results = {}
        all_ok = True

        # DB
        try:
            t0 = time.monotonic()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            results["db"] = _json_ok("postgresql", (time.monotonic() - t0) * 1000)
        except Exception as e:
            results["db"] = _json_fail("postgresql", str(e))
            all_ok = False

        # Redis
        try:
            t0 = time.monotonic()
            cache.set("_health_check", "1", timeout=5)
            val = cache.get("_health_check")
            if val != "1":
                raise ValueError("Cache read/write mismatch")
            results["redis"] = _json_ok("redis", (time.monotonic() - t0) * 1000)
        except Exception as e:
            results["redis"] = _json_fail("redis", str(e))
            all_ok = False

        # Celery (ping via inspect — fast timeout)
        try:
            from celery import current_app
            inspector = current_app.control.inspect(timeout=1.5)
            ping = inspector.ping()
            if ping:
                results["celery"] = _json_ok("celery")
            else:
                results["celery"] = {"status": "warn", "component": "celery", "note": "No workers responded"}
        except Exception as e:
            results["celery"] = _json_fail("celery", str(e))
            # Celery being down is a warning, not critical
            logger.warning(f"[Health] Celery ping failed: {e}")

        monitoring = {
            "active_users": 0,
            "ws_connections": 0,
            "celery_queue": 0,
            "requests_per_min": 0,
        }
        try:
            from django.utils import timezone
            from analytics.selectors import (
                _get_celery_queue_depth,
                _get_requests_per_minute,
                _get_ws_metrics,
            )
            active_users, ws_connections = _get_ws_metrics()
            monitoring = {
                "active_users": active_users,
                "ws_connections": ws_connections,
                "celery_queue": _get_celery_queue_depth(),
                "requests_per_min": _get_requests_per_minute(timezone.now()),
            }
            results["websocket"] = _json_ok("channels")
        except Exception as e:
            results["websocket"] = _json_fail("channels", str(e))
            logger.warning(f"[Health] realtime monitoring failed: {e}")

        http_status = 200 if all_ok else 503
        return JsonResponse(
            {
                "success": all_ok,
                "status":  "healthy" if all_ok else "degraded",
                "version": "1.0",
                "checks":  results,
                "monitoring": monitoring,
                "realtime": monitoring,
            },
            status=http_status,
        )


class HealthDBView(View):
    """
    GET /api/v1/health/db/
    PostgreSQL connectivity check with latency measurement.
    """

    def get(self, request):
        try:
            t0 = time.monotonic()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                row = cursor.fetchone()
            latency = (time.monotonic() - t0) * 1000

            return JsonResponse({
                "success":    True,
                "status":     "ok",
                "component":  "postgresql",
                "latency_ms": round(latency, 2),
                "result":     row[0] if row else None,
            })
        except Exception as e:
            logger.error(f"[Health] DB check failed: {e}")
            return JsonResponse({
                "success":   False,
                "status":    "fail",
                "component": "postgresql",
                "error":     str(e),
            }, status=503)


class HealthRedisView(View):
    """
    GET /api/v1/health/redis/
    Redis connectivity and read/write check.
    """

    def get(self, request):
        try:
            t0 = time.monotonic()
            cache.set("_health_redis", "ping", timeout=10)
            val = cache.get("_health_redis")
            latency = (time.monotonic() - t0) * 1000

            if val != "ping":
                raise ValueError("Redis read/write mismatch")

            return JsonResponse({
                "success":    True,
                "status":     "ok",
                "component":  "redis",
                "latency_ms": round(latency, 2),
            })
        except Exception as e:
            logger.error(f"[Health] Redis check failed: {e}")
            return JsonResponse({
                "success":   False,
                "status":    "fail",
                "component": "redis",
                "error":     str(e),
            }, status=503)


class HealthCeleryView(View):
    """
    GET /api/v1/health/celery/
    Celery worker availability check via inspect ping.
    """

    def get(self, request):
        try:
            from celery import current_app
            t0 = time.monotonic()
            inspector = current_app.control.inspect(timeout=2.0)
            ping = inspector.ping()
            latency = (time.monotonic() - t0) * 1000

            if not ping:
                return JsonResponse({
                    "success":    False,
                    "status":     "warn",
                    "component":  "celery",
                    "note":       "No Celery workers responded to ping",
                    "workers":    [],
                    "latency_ms": round(latency, 2),
                }, status=503)

            workers = list(ping.keys())
            return JsonResponse({
                "success":    True,
                "status":     "ok",
                "component":  "celery",
                "workers":    workers,
                "worker_count": len(workers),
                "latency_ms": round(latency, 2),
            })
        except Exception as e:
            logger.error(f"[Health] Celery check failed: {e}")
            return JsonResponse({
                "success":   False,
                "status":    "fail",
                "component": "celery",
                "error":     str(e),
            }, status=503)
