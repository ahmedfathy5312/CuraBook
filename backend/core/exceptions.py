"""
CuraBook — Custom DRF Exception Handler + Business Exceptions
Returns consistent JSON error format across all endpoints.

Custom Exceptions:
    BusinessLogicException — illegal state transitions, workflow violations
    AppointmentConflictException — double booking attempts
    SlotUnavailableException — slot no longer available
    WorkplaceAccessDenied — assistant/admin accessing wrong workplace
"""

import logging
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied, ValidationError

logger = logging.getLogger('curabook')


# ─────────────────────────────────────────────
# Custom Business Exceptions
# ─────────────────────────────────────────────

class BusinessLogicException(APIException):
    """
    Raised when a business rule is violated — e.g. illegal state transition.
    Returns HTTP 422 Unprocessable Entity.

    Usage:
        raise BusinessLogicException(
            code="INVALID_TRANSITION",
            message="Cannot confirm a CANCELLED appointment.",
        )
    """
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Business logic violation."
    default_code   = "BUSINESS_LOGIC_ERROR"

    def __init__(self, message: str = None, code: str = None, details: dict = None):
        self.code    = code    or self.default_code
        self.message = message or self.default_detail
        self.details = details or {}
        super().__init__(detail=self.message, code=self.code)

    def __str__(self):
        return f"[{self.code}] {self.message}"


class AppointmentConflictException(BusinessLogicException):
    """Slot already booked — double booking attempt."""
    def __init__(self, message="This slot is already booked.", details=None):
        super().__init__(message=message, code="APPOINTMENT_CONFLICT", details=details)


class SlotUnavailableException(BusinessLogicException):
    """Requested slot is no longer available or doesn't exist."""
    def __init__(self, message="Slot unavailable.", details=None):
        super().__init__(message=message, code="SLOT_UNAVAILABLE", details=details)


class InvalidStateTransitionException(BusinessLogicException):
    """Raised when an appointment state transition is not allowed."""
    def __init__(self, from_status: str, to_status: str):
        super().__init__(
            message=f"Cannot transition from {from_status} to {to_status}.",
            code="INVALID_STATE_TRANSITION",
            details={"from": from_status, "to": to_status},
        )


class WorkplaceAccessDeniedException(BusinessLogicException):
    """Assistant or admin trying to access a workplace they're not assigned to."""
    status_code = status.HTTP_403_FORBIDDEN

    def __init__(self, message="You do not have permission to access this resource.", details=None):
        super().__init__(message=message, code="WORKPLACE_ACCESS_DENIED", details=details)


def custom_exception_handler(exc, context):
    """
    Wraps DRF exceptions in a consistent format:
    {
        "success": false,
        "error": {
            "code": "PERMISSION_DENIED",
            "message": "...",
            "details": {...}
        }
    }
    """
    # Let DRF handle it first
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            'success': False,
            'error': {
                'code':    _get_error_code(response.status_code),
                'message': _extract_message(response.data),
                'details': response.data,
            }
        }
        # BusinessLogicException carries its own code — use it
        if isinstance(exc, BusinessLogicException):
            error_data['error']['code']    = exc.code
            error_data['error']['message'] = exc.message
            error_data['error']['details'] = exc.details

        response.data = error_data
        return response

    # Handle Django exceptions not caught by DRF
    if isinstance(exc, PermissionDenied):
        return Response({
            'success': False,
            'error': {
                'code':    'PERMISSION_DENIED',
                'message': str(exc),
                'details': {},
            }
        }, status=status.HTTP_403_FORBIDDEN)

    if isinstance(exc, ValidationError):
        return Response({
            'success': False,
            'error': {
                'code':    'VALIDATION_ERROR',
                'message': 'Validation failed.',
                'details': exc.message_dict if hasattr(exc, 'message_dict') else str(exc),
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    # Unhandled — log it
    logger.exception(f'Unhandled exception in {context.get("view", "unknown")}: {exc}')
    return None


def _get_error_code(status_code: int) -> str:
    return {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'PERMISSION_DENIED',
        404: 'NOT_FOUND',
        405: 'METHOD_NOT_ALLOWED',
        409: 'CONFLICT',
        429: 'TOO_MANY_REQUESTS',
        500: 'SERVER_ERROR',
    }.get(status_code, 'ERROR')


def _extract_message(data) -> str:
    if isinstance(data, dict):
        if 'detail' in data:
            return str(data['detail'])
        first_key = next(iter(data), None)
        if first_key:
            val = data[first_key]
            return str(val[0]) if isinstance(val, list) else str(val)
    if isinstance(data, list):
        return str(data[0])
    return str(data)
