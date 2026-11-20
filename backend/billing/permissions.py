"""
CuraBook — Billing Permissions
================================
DRF permission classes that enforce subscription limits.
"""

from rest_framework.permissions import BasePermission

from billing.models import Subscription


class HasActiveSubscription(BasePermission):
    """
    Blocks access if the user's subscription is expired/cancelled.
    Allows access during trial and active periods.
    """
    message = (
        "Your subscription has expired. "
        "Please upgrade at /billing to continue using CuraBook."
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Platform admins bypass billing checks
        if user.is_platform_admin or user.is_staff:
            return True

        # Patients are always free
        if user.is_patient:
            return True

        try:
            return user.subscription.is_active
        except Subscription.DoesNotExist:
            # No subscription yet — allow read-only, block writes
            return request.method in ('GET', 'HEAD', 'OPTIONS')


class CanUseAnalytics(BasePermission):
    """Requires a plan with has_analytics=True."""
    message = "Analytics require a Pro or Enterprise plan."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_platform_admin or user.is_staff:
            return True
        try:
            return user.subscription.plan.has_analytics
        except Subscription.DoesNotExist:
            return False


class CanUseSMSReminders(BasePermission):
    """Requires a plan with has_sms_reminders=True."""
    message = "SMS reminders require a Starter plan or above."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_platform_admin or user.is_staff:
            return True
        try:
            return user.subscription.plan.has_sms_reminders
        except Subscription.DoesNotExist:
            return False
