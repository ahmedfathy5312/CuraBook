"""
CuraBook — Feature Flags
==========================
Centralized feature flag management using django-waffle.

All feature flags are documented and accessed through this module.
Never use waffle directly in app code — always go through this module.

Setup:
    pip install django-waffle
    python manage.py migrate   # creates waffle tables
    python manage.py waffle_flag new_booking_flow --everyone --create
    python manage.py waffle_switch elasticsearch_search on --create

Usage:
    from core.feature_flags import flags, is_flag_active, is_switch_active

    # In views (request-aware):
    if flags.NEW_BOOKING_FLOW.is_active(request):
        ...

    # In services/tasks (no request):
    if is_switch_active(flags.ELASTICSEARCH_SEARCH):
        ...
"""

import logging
from dataclasses import dataclass

logger = logging.getLogger("curabook")


# ─────────────────────────────────────────────
# Flag Definitions
# ─────────────────────────────────────────────

@dataclass
class FeatureFlag:
    """Metadata for a feature flag."""
    name: str
    description: str
    default: bool = False

    def is_active(self, request=None) -> bool:
        """Check if this flag is active (request-aware)."""
        try:
            import waffle
            if request:
                return waffle.flag_is_active(request, self.name)
            return waffle.switch_is_active(self.name)
        except ImportError:
            return self.default
        except Exception as e:
            logger.warning(f"[FeatureFlag] Error checking flag '{self.name}': {e}")
            return self.default


class Flags:
    """All CuraBook feature flags, centralized."""

    # A/B test: new booking flow with slot selection UI
    NEW_BOOKING_FLOW = FeatureFlag(
        name="new_booking_flow",
        description="Enable new multi-step booking flow with calendar UI",
        default=False,
    )

    # Switch to Elasticsearch-backed doctor search
    ELASTICSEARCH_SEARCH = FeatureFlag(
        name="elasticsearch_search",
        description="Use Elasticsearch instead of PostgreSQL for doctor search",
        default=False,
    )

    # SMS notifications alongside email
    SMS_NOTIFICATIONS = FeatureFlag(
        name="sms_notifications",
        description="Send SMS notifications for appointments (requires Twilio)",
        default=False,
    )

    # Online payment gateway
    ONLINE_PAYMENT = FeatureFlag(
        name="online_payment",
        description="Enable online payment for booking (requires payment gateway)",
        default=False,
    )

    # Video consultation / telemedicine
    VIDEO_CONSULTATION = FeatureFlag(
        name="video_consultation",
        description="Enable video call functionality for online appointments",
        default=False,
    )

    # Advanced analytics dashboard
    ADVANCED_ANALYTICS = FeatureFlag(
        name="advanced_analytics",
        description="Enable advanced analytics charts and export for hospital admins",
        default=False,
    )

    # Doctor rating weight in search
    RATING_WEIGHTED_SEARCH = FeatureFlag(
        name="rating_weighted_search",
        description="Weight search results by doctor rating (may affect performance)",
        default=True,
    )


# Singleton instance
flags = Flags()


# ─────────────────────────────────────────────
# Convenience helpers
# ─────────────────────────────────────────────

def is_flag_active(flag: FeatureFlag, request=None) -> bool:
    """Check if a flag is active. Gracefully handles waffle not installed."""
    return flag.is_active(request)


def is_switch_active(flag: FeatureFlag) -> bool:
    """Check switch (no request needed). For services/tasks."""
    return flag.is_active(request=None)


def get_all_flags() -> dict:
    """Return all flags and their current status (for admin/health check)."""
    result = {}
    for attr_name in dir(flags):
        flag = getattr(flags, attr_name)
        if isinstance(flag, FeatureFlag):
            result[flag.name] = {
                "description": flag.description,
                "default":     flag.default,
                "active":      flag.is_active(),
            }
    return result
