from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class SearchLog(models.Model):

    class SearchType(models.TextChoices):
        DOCTOR = 'DOCTOR', 'Doctor'
        CLINIC = 'CLINIC', 'Clinic'
        HOSPITAL = 'HOSPITAL', 'Hospital'
        SPECIALTY = 'SPECIALTY', 'Specialty'
        GENERAL = 'GENERAL', 'General'

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='search_logs'
    )

    query = models.CharField(max_length=255, db_index=True)

    search_type = models.CharField(
        max_length=20,
        choices=SearchType.choices,
        default=SearchType.GENERAL,
        db_index=True
    )

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['query']),
            models.Index(fields=['search_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.search_type} | {self.query}"
