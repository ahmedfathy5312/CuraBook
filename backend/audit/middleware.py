"""
CuraBook — Audit Middleware (HARDENED)
=======================================
Improvements:
  1. RequestID — unique UUID per request for distributed tracing
  2. ClientIP — real IP behind proxy
  3. Both stored on request object for views/services
"""

import logging
import uuid

logger = logging.getLogger("curabook")

AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PATHS = {"/api/v1/search/", "/api/v1/scheduling/slots/", "/health/"}


class RequestIDMiddleware:
    """Assigns a unique UUID4 to every request (request.request_id)."""
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        request.request_id = str(uuid.uuid4())
        # ✅ Store in thread-local so every log line gets the request_id
        try:
            from core.logging_filters import set_request_id
            set_request_id(request.request_id)
        except Exception:
            pass
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        return response


class ClientIPMiddleware:
    """Resolves real client IP respecting reverse proxies (request.client_ip)."""
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        request.client_ip = self._resolve_ip(request)
        return self.get_response(request)
    @staticmethod
    def _resolve_ip(request) -> str:
        x_fwd = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_fwd:
            return x_fwd.split(",")[0].strip()
        x_real = request.META.get("HTTP_X_REAL_IP")
        if x_real:
            return x_real.strip()
        return request.META.get("REMOTE_ADDR", "unknown")


class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        response = self.get_response(request)
        if (
            request.method in AUDIT_METHODS
            and request.path.startswith("/api/")
            and not any(request.path.startswith(p) for p in SKIP_PATHS)
            and response.status_code < 500
        ):
            user = getattr(request, "user", None)
            request_id = getattr(request, "request_id", "no-id")
            ip = getattr(request, "client_ip", None) or request.META.get("REMOTE_ADDR", "unknown")
            username = getattr(user, "username", "anon")
            logger.info(
                f"[AUDIT] {request.method} {request.path} -> {response.status_code} "
                f"| user={username} | ip={ip} | req_id={request_id}"
            )
        return response
