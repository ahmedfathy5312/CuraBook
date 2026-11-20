
from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from common.soft_delete import SoftDeleteModel
from common.models import PublicIdMixin

User = settings.AUTH_USER_MODEL

# ==================================================
# Validators
# ==================================================
phone_validator = RegexValidator(
    regex=r'^\+?\d{7,15}$',
    message="Enter a valid phone number (7–15 digits, optional +)."
)

# ==================================================
# Clinic (PRIVATE – owned by a doctor)
# ==================================================
class Clinic(PublicIdMixin, SoftDeleteModel):
    """
    Private clinic owned by a doctor.
    FIX D: Changed from OneToOneField → ForeignKey so doctors can own
    multiple clinics (e.g. separate downtown and suburban practices).
    Migration: 0008_clinic_owner_fk
    """

    owner = models.ForeignKey(
        'doctors.DoctorProfile',
        on_delete=models.CASCADE,
        related_name='clinics_owned'
    )

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True, null=True)  # ✅ null=True prevents empty-string unique collision

    hospital = models.ForeignKey(
        'hospital.Hospital',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clinics'
    )

    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        validators=[phone_validator]
    )

    # ── Geo Coordinates (for map & distance search) ──────────────
    latitude  = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text="GPS latitude (e.g. 30.044420)"
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text="GPS longitude (e.g. 31.235712)"
    )

    # ── Pricing ──────────────────────────────────────────────────
    consultation_price = models.DecimalField(
        max_digits=8, decimal_places=2,
        null=True, blank=True,
        help_text="Consultation price at this clinic (overrides doctor default)"
    )

    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Clinic"
        verbose_name_plural = "Clinics"
        ordering = ['name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            # ✅ FIX: if name is empty, fall back to owner username to avoid slug=""
            raw = self.name or (self.owner.user.username if self.owner_id else "clinic")
            base = slugify(raw) or "clinic"
            slug = base
            counter = 1
            while Clinic.objects.filter(slug=slug).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} (Dr. {self.owner.user.username})"


# ==================================================
# Clinic Staff (Reception / Nurse / Assistant)
# ==================================================
class ClinicStaff(models.Model):
    """
    Staff members working in a private clinic
    """

    ROLE_CHOICES = [
        ('reception', 'Reception'),
        ('nurse', 'Nurse'),
        ('assistant', 'Assistant'),
    ]

    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.CASCADE,
        related_name='staff'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='clinic_staff_links'
    )

    role = models.CharField(
        max_length=50,
        choices=ROLE_CHOICES
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Clinic Staff"
        verbose_name_plural = "Clinic Staff"
        unique_together = ('clinic', 'user')
        indexes = [
            models.Index(fields=['clinic']),
            models.Index(fields=['user']),
            models.Index(fields=['role']),
        ]

    def clean(self):
        # Prevent doctor from being added as staff
        if getattr(self.user, 'is_doctor', False):
            raise ValidationError("Doctor cannot be clinic staff")

    def __str__(self):
        return f"{self.user.username} ({self.role}) @ {self.clinic.name}"


# ==================================================
# Clinic Assistant
# An assistant can be assigned to MULTIPLE clinics
# ==================================================
class ClinicAssistant(models.Model):
    """
    Links an AssistantProfile to one or more clinics.
    This allows an assistant to manage appointments across multiple clinics.
    """

    ROLE_CHOICES = [
        ('receptionist', 'Receptionist'),
        ('coordinator', 'Coordinator'),
        ('supervisor', 'Supervisor'),
    ]

    assistant = models.ForeignKey(
        'assistants.AssistantProfile',
        on_delete=models.CASCADE,
        related_name='clinic_assignments'
    )

    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.CASCADE,
        related_name='assistant_assignments'
    )

    role = models.CharField(
        max_length=50,
        choices=ROLE_CHOICES,
        default='receptionist'
    )

    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Clinic Assistant"
        verbose_name_plural = "Clinic Assistants"
        unique_together = ('assistant', 'clinic')
        indexes = [
            models.Index(fields=['assistant', 'is_active']),
            models.Index(fields=['clinic', 'is_active']),
        ]

    def __str__(self):
        return f"{self.assistant.user.username} → {self.clinic.name} ({self.role})"
