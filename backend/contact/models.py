"""
CuraBook — Contact Us Domain  (FIX B-11)
==========================================
Stores contact form submissions so admins can review them
in the Django admin panel and reply to users.
"""

from django.db import models
from django.utils import timezone


class ContactMessage(models.Model):
    """Stores a single 'Contact Us' form submission."""

    class StatusChoices(models.TextChoices):
        NEW      = "new",      "New"
        READ     = "read",     "Read"
        REPLIED  = "replied",  "Replied"
        ARCHIVED = "archived", "Archived"

    # ── Sender Info ───────────────────────────────────────────
    name    = models.CharField(max_length=255)
    email   = models.EmailField()
    subject = models.CharField(max_length=255, blank=True)
    message = models.TextField()

    # ── Meta ─────────────────────────────────────────────────
    status     = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.NEW,
        db_index=True,
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Contact Message"
        verbose_name_plural = "Contact Messages"

    def __str__(self):
        return f"{self.name} <{self.email}> — {self.subject or 'No subject'}"
