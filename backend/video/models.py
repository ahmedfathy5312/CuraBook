"""
CuraBook — Video Consultation Models
"""
import uuid
from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class VideoSession(models.Model):
    """جلسة استشارة فيديو مرتبطة بموعد."""

    class Status(models.TextChoices):
        PENDING   = 'pending',   'Pending'
        ACTIVE    = 'active',    'Active'
        ENDED     = 'ended',     'Ended'
        CANCELLED = 'cancelled', 'Cancelled'

    class Provider(models.TextChoices):
        DAILY    = 'daily',    'Daily.co'
        JITSI    = 'jitsi',    'Jitsi Meet'
        WHEREBY  = 'whereby',  'Whereby'

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment  = models.OneToOneField(
        'appointments.Appointment',
        on_delete=models.CASCADE,
        related_name='video_session',
    )
    provider     = models.CharField(max_length=20, choices=Provider.choices, default=Provider.DAILY)
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Provider-specific data
    room_name    = models.CharField(max_length=255, blank=True)
    room_url     = models.URLField(blank=True)
    # Tokens are NOT stored in DB — they are generated on-demand via get_token()
    # to ensure they are always short-lived (15 minutes).
    # Storing long-lived tokens in the DB would mean a DB leak = permanent room access.

    started_at   = models.DateTimeField(null=True, blank=True)
    ended_at     = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(default=0)

    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Video Session'

    def __str__(self):
        return f'VideoSession({self.appointment_id}, {self.status})'

    @property
    def is_active(self):
        return self.status == self.Status.ACTIVE

    def get_token(self, *, is_doctor: bool) -> str:
        """
        Generate a fresh short-lived token (15 minutes) on demand.

        Tokens are NEVER stored in the database. Each call to get_token()
        produces a new token valid for TOKEN_TTL seconds. This means:
          - A DB breach reveals no usable tokens.
          - Token expiry is always <= 15 minutes away.

        Called by VideoSessionView when the frontend requests room credentials.
        """
        from .providers import get_video_provider
        provider = get_video_provider()
        return provider.create_short_lived_token(
            room_name=self.room_name,
            is_moderator=is_doctor,
        )
