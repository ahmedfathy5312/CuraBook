"""
CuraBook — Doctors Domain
==========================
Responsible for: DoctorProfile and doctor-specific data.
Booking/scheduling logic lives in appointments/ and scheduling/.
"""

from django.conf import settings
from django.db import models
from django.utils.text import slugify

from common.models import PublicIdMixin
from common.soft_delete import SoftDeleteModel
from common.models import TimestampedModel


class DoctorProfile(PublicIdMixin, SoftDeleteModel, TimestampedModel):
    """
    Extended profile for doctors.
    One doctor can work in multiple clinics AND multiple hospitals.
    Inherits: is_deleted, deleted_at, created_at, updated_at from BaseModel.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="doctor_profile",
    )

    # ── Professional Info ─────────────────────────────────────────
    specialty        = models.CharField(max_length=255, blank=True)
    license_number   = models.CharField(max_length=100, blank=True, null=True, unique=True)
    gender           = models.CharField(max_length=20, blank=True)
    date_of_birth    = models.DateField(blank=True, null=True, help_text="Used to calculate age dynamically")
    bio              = models.TextField(blank=True, null=True)
    start_of_practice_date = models.DateField(
        blank=True, null=True,
        help_text="Date the doctor started practising medicine. Used to calculate experience_years dynamically.",
    )

    # ── Education & Skills ────────────────────────────────────────
    education = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "List of education entries. "
            "Example: [{\"degree\": \"MD\", \"university\": \"Cairo University\", \"year\": 2010}]"
        ),
    )
    languages = models.JSONField(
        default=list,
        blank=True,
        help_text="Languages spoken. Example: [\"Arabic\", \"English\"]",
    )
    certificates = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "List of certificates. "
            "Example: [{\"title\": \"Board Certified\", \"issuer\": \"EMA\", \"year\": 2015}]"
        ),
    )

    # ── Profile Image ─────────────────────────────────────────────
    profile_image = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="URL of doctor profile photo (stored in S3 / CDN)",
    )
    cover_image = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="URL of doctor profile cover/banner image (stored in S3 / CDN)",
    )

    # ── Pricing ───────────────────────────────────────────────────
    consultation_fee = models.DecimalField(
        max_digits=8, decimal_places=2,
        null=True, blank=True,
        help_text="Default consultation fee (can be overridden per clinic)",
    )

    # ── Profile Status ────────────────────────────────────────────
    slug              = models.SlugField(max_length=255, blank=True, unique=True, null=True)
    accepts_booking   = models.BooleanField(default=True)
    profile_completed = models.BooleanField(default=False)
    slot_duration     = models.PositiveIntegerField(default=30)

    class Meta(SoftDeleteModel.Meta):
        verbose_name        = "Doctor Profile"
        verbose_name_plural = "Doctor Profiles"
        indexes = [
            models.Index(fields=["specialty"]),
            models.Index(fields=["license_number"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["accepts_booking"]),
            # Search & sort performance
            models.Index(fields=["consultation_fee"]),
            # avg_rating indexes are defined via raw SQL in migration 0003
            # (avg_rating is an annotation, not a model field)
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            raw = self.user.full_name or self.user.username or "doctor"
            base = slugify(raw) or "doctor"
            slug = base
            counter = 1
            while DoctorProfile.objects.filter(slug=slug).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Dr. {self.user.full_name or self.user.username}"


    @property
    def age(self) -> "int | None":
        """Calculated dynamically from date_of_birth — never stale."""
        if not self.date_of_birth:
            return None
        from django.utils import timezone
        today = timezone.now().date()
        dob = self.date_of_birth
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    @property
    def experience_years(self) -> "int | None":
        """
        Calculated dynamically from start_of_practice_date — never stale.
        Returns None if start_of_practice_date is not set.
        """
        if not self.start_of_practice_date:
            return None
        from django.utils import timezone
        today = timezone.now().date()
        spd = self.start_of_practice_date
        years = today.year - spd.year - ((today.month, today.day) < (spd.month, spd.day))
        return max(0, years)

    @property
    def full_name(self) -> str:
        return self.user.full_name or self.user.username
