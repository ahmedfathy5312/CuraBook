"""
CuraBook — Custom Throttle Classes

Scoped rate limits per operation type.
Applied via permission_classes or DEFAULT_THROTTLE_CLASSES.

Rates:
  LoginThrottle:    5 attempts/minute  (brute force protection)
  BookingThrottle:  10 bookings/minute (abuse protection)
  SearchThrottle:   30 searches/minute (API protection)
  RegisterThrottle: 3 signups/hour    (spam protection)
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


# ─── Auth ──────────────────────────────────────────
class LoginRateThrottle(AnonRateThrottle):
    """Max 5 login attempts per minute per IP."""
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    """Max 3 account registrations per hour per IP."""
    scope = 'register'


class PasswordResetThrottle(AnonRateThrottle):
    """Max 3 password reset requests per hour per IP."""
    scope = 'password_reset'


# ─── Booking ───────────────────────────────────────
class BookingRateThrottle(UserRateThrottle):
    """Max 10 booking attempts per minute per user."""
    scope = 'booking'


class AppointmentActionThrottle(UserRateThrottle):
    """
    FIX B-09: Rate limit for appointment state-change actions.
    Prevents spam on confirm / reject / cancel / complete / no-show.
    Max 30 state changes per minute per user.
    Without this, a malicious client can spam state changes and exhaust
    DB connections via the select_for_update() lock in services.py.
    """
    scope = 'appointment_action'


# ─── Search ────────────────────────────────────────
class SearchRateThrottle(AnonRateThrottle):
    """Max 30 search requests per minute per IP."""
    scope = 'search'


class AuthSearchRateThrottle(UserRateThrottle):
    """Max 60 search requests per minute for authenticated users."""
    scope = 'search_auth'


# ─── WebSocket ─────────────────────────────────────
class WSConnectThrottle(AnonRateThrottle):
    """Max 20 WebSocket connection attempts per minute per IP."""
    scope = 'ws_connect'


class DashboardRateThrottle(UserRateThrottle):
    """
    Rate limiting for dashboard endpoints.
    Dashboard queries can be expensive — limit to 30/min.
    """
    scope = "dashboard"
