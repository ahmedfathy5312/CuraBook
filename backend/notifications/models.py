from datetime import datetime, date
from django.db import models
from django.conf import settings
from common.soft_delete import SoftDeleteModel

User = settings.AUTH_USER_MODEL


class Notification(SoftDeleteModel):

    class Type(models.TextChoices):
        NEW_APPOINTMENT              = 'NEW_APPOINTMENT',              'New Appointment'
        APPOINTMENT_CONFIRMED        = 'APPOINTMENT_CONFIRMED',        'Appointment Confirmed'
        APPOINTMENT_REJECTED         = 'APPOINTMENT_REJECTED',         'Appointment Rejected'
        APPOINTMENT_CANCELLED        = 'APPOINTMENT_CANCELLED',        'Appointment Cancelled'
        APPOINTMENT_COMPLETED        = 'APPOINTMENT_COMPLETED',        'Appointment Completed'
        APPOINTMENT_REMINDER         = 'APPOINTMENT_REMINDER',         'Appointment Reminder'
        APPOINTMENT_NO_SHOW          = 'APPOINTMENT_NO_SHOW',          'Appointment No Show'          # Added with BUG-04
        # FIX BUG-08: Reschedule notification types missing
        RESCHEDULE_REQUESTED         = 'RESCHEDULE_REQUESTED',         'Reschedule Requested'
        RESCHEDULE_APPROVED          = 'RESCHEDULE_APPROVED',          'Reschedule Approved'
        RESCHEDULE_REJECTED          = 'RESCHEDULE_REJECTED',          'Reschedule Rejected'
        SYSTEM                       = 'SYSTEM',                       'System'

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications'
    )

    type = models.CharField(
        max_length=40, choices=Type.choices, default=Type.SYSTEM
    )
    title   = models.CharField(max_length=255)
    body    = models.TextField()
    is_read = models.BooleanField(default=False)

    # Extra context (appointment_id, doctor_name, etc.)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"[{self.type}] → {self.user.username}: {self.title}"

    def save(self, *args, **kwargs):
        # Ensure datetime values are JSON-safe in metadata
        if self.metadata:
            self.metadata = {
                k: v.isoformat() if isinstance(v, (datetime, date)) else v
                for k, v in self.metadata.items()
            }
        super().save(*args, **kwargs)


# ==================================================
# NotificationPreferences
# Per-user control over which channels they receive notifications on.
# ==================================================
class NotificationPreferences(models.Model):
    """
    Stores the user's per-channel notification opt-in/out preferences.

    Channels:
        email   — transactional emails (appointment confirmed, reminder…)
        push    — mobile push notifications (future)
        in_app  — in-app bell / WebSocket notifications (default: always on)

    One record per user — created with defaults on first access via
    NotificationPreferences.objects.get_or_create(user=user).

    Usage in notification service:
        prefs, _ = NotificationPreferences.objects.get_or_create(user=appointment.patient)
        if prefs.email_enabled:
            send_email(...)
        if prefs.in_app_enabled:
            push_websocket(...)
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='notification_preferences',
    )

    # ── Channels ──────────────────────────────────────────────────
    email_enabled  = models.BooleanField(
        default=True,
        help_text="Receive appointment emails (confirmations, reminders, cancellations).",
    )
    push_enabled   = models.BooleanField(
        default=True,
        help_text="Receive mobile push notifications (requires device token).",
    )
    in_app_enabled = models.BooleanField(
        default=True,
        help_text="Receive in-app WebSocket notifications (bell icon).",
    )

    # ── Granular event controls ───────────────────────────────────
    notify_on_appointment_confirmed  = models.BooleanField(default=True)
    notify_on_appointment_rejected   = models.BooleanField(default=True)
    notify_on_appointment_cancelled  = models.BooleanField(default=True)
    notify_on_appointment_reminder   = models.BooleanField(default=True)
    notify_on_new_review             = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = "Notification Preferences"
        verbose_name_plural = "Notification Preferences"

    def __str__(self):
        return f"NotifPrefs({self.user.username})"

    @classmethod
    def for_user(cls, user):
        """
        Safe accessor — returns preferences, creating defaults if missing.
        Always use this instead of .get() to avoid DoesNotExist errors.

        Usage:
            prefs = NotificationPreferences.for_user(user)
            if prefs.email_enabled:
                ...
        """
        prefs, _ = cls.objects.get_or_create(user=user)
        return prefs
