"""
CuraBook — Custom JSON Renderer
=================================
Wraps every DRF response in the standard success/error envelope
at the renderer layer — so even third-party views (SimpleJWT, etc.)
return consistent JSON.

Registered in settings:
    REST_FRAMEWORK = {
        'DEFAULT_RENDERER_CLASSES': ['core.response.renderer.CuraBookRenderer'],
    }
"""

import json
from rest_framework.renderers import JSONRenderer


class CuraBookRenderer(JSONRenderer):
    """
    Intercepts all JSON responses and wraps them in the standard envelope
    IF they haven't already been wrapped by SuccessResponse/ErrorResponse.
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return super().render(data, accepted_media_type, renderer_context)

        # Already wrapped — pass through
        if isinstance(data, dict) and "success" in data:
            return super().render(data, accepted_media_type, renderer_context)

        # Error response from DRF exception handler — pass through
        if isinstance(data, dict) and "error" in data:
            return super().render(data, accepted_media_type, renderer_context)

        response = renderer_context.get("response") if renderer_context else None
        status_code = getattr(response, "status_code", 200)

        # 4xx/5xx without our wrapper — auto-wrap as error
        if status_code >= 400:
            wrapped = {
                "success": False,
                "error": {
                    "code": _status_to_code(status_code),
                    "message": _extract_message(data),
                    "details": data,
                },
            }
        else:
            # 2xx/3xx — wrap as success
            wrapped = {
                "success": True,
                "data": data,
                "message": "",
            }

        return super().render(wrapped, accepted_media_type, renderer_context)


def _status_to_code(status_code: int) -> str:
    return {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "PERMISSION_DENIED",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        429: "TOO_MANY_REQUESTS",
        500: "SERVER_ERROR",
    }.get(status_code, "ERROR")


def _extract_message(data) -> str:
    if isinstance(data, dict):
        for key in ("detail", "message", "non_field_errors"):
            if key in data:
                val = data[key]
                return str(val[0]) if isinstance(val, list) else str(val)
        first_key = next(iter(data), None)
        if first_key:
            val = data[first_key]
            return str(val[0]) if isinstance(val, list) else str(val)
    if isinstance(data, list) and data:
        return str(data[0])
    return str(data)
