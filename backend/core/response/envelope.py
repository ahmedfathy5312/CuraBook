"""
CuraBook — Unified API Response Envelope
==========================================
ALL API responses (success and error) must use this module.

Success format:
{
    "success": true,
    "data": { ... },
    "message": "Optional message"
}

Error format:
{
    "success": false,
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable message",
        "details": { ... }
    }
}

Usage in ViewSets:
    from core.response import SuccessResponse
    return SuccessResponse(data=serializer.data, message="Appointment created.")
    return SuccessResponse(data=serializer.data, status=201)
"""

from rest_framework.response import Response
from rest_framework import status as http_status


class SuccessResponse(Response):
    """
    Wraps data in the standard success envelope.

    Usage:
        return SuccessResponse(data=serializer.data)
        return SuccessResponse(data=serializer.data, message="Done.", status=201)
        return SuccessResponse(message="Deleted.")  # data defaults to {}
    """

    def __init__(self, data=None, message: str = "", status: int = http_status.HTTP_200_OK, **kwargs):
        envelope = {
            "success": True,
            "data": data if data is not None else {},
            "message": message,
        }
        super().__init__(data=envelope, status=status, **kwargs)


class ErrorResponse(Response):
    """
    Wraps error info in the standard error envelope.

    Usage:
        return ErrorResponse(code="APPOINTMENT_CONFLICT", message="Slot already booked.", status=409)
    """

    def __init__(
        self,
        code: str = "ERROR",
        message: str = "An error occurred.",
        details=None,
        status: int = http_status.HTTP_400_BAD_REQUEST,
        **kwargs,
    ):
        envelope = {
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            },
        }
        super().__init__(data=envelope, status=status, **kwargs)


def api_response(data=None, message: str = "", status: int = http_status.HTTP_200_OK) -> SuccessResponse:
    """
    Functional shorthand for SuccessResponse.

    Usage:
        return api_response(data=serializer.data, message="OK")
    """
    return SuccessResponse(data=data, message=message, status=status)
