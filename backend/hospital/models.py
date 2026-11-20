from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.core.validators import RegexValidator, FileExtensionValidator
from django.core.exceptions import ValidationError
from common.soft_delete import SoftDeleteModel
from common.models import PublicIdMixin

User = settings.AUTH_USER_MODEL


# ==================================================
# Validators
# ==================================================
phone_validator = RegexValidator(
    regex=r'^\+?\d{9,15}$',
    message="Phone number must be entered in the format +999999999."
)


# ==================================================
# Hospital
# ==================================================
class Hospital(PublicIdMixin, SoftDeleteModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True, null=True)  # ✅ null=True prevents empty-string unique collision

    city    = models.CharField(max_length=100, blank=True, help_text="City where hospital is located")
    address = models.TextField(blank=True)
    phone   = models.CharField(
        max_length=15,
        validators=[phone_validator],
        blank=True
    )
    email = models.EmailField(blank=True)

    logo = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="URL of hospital logo (stored in S3 / CDN)",
    )

    is_verified = models.BooleanField(
        default=False,
        help_text="Verified by platform admin",
    )

    # ── Stats (denormalized for fast search/sort) ──
    rating = models.DecimalField(
        max_digits=3, decimal_places=1,
        null=True, blank=True,
        help_text="Average rating (0.0–5.0), updated by review signals",
    )
    doctors_count = models.PositiveIntegerField(
        default=0,
        help_text="Cached count of active doctors, updated by signals",
    )

    metadata = models.JSONField(default=dict, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Hospital"
        verbose_name_plural = "Hospitals"

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or f"hospital-{self.pk or 'new'}"  # ✅ FIX: never store ""
            slug = base
            counter = 1
            while Hospital.objects.filter(slug=slug).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ==================================================
# Department
# ==================================================
# FIX BUG-05: Removed duplicate Department class.
# Canonical model is apps.departments.Department (related_name='app_departments').
# Import it here so existing imports from hospital.models still work.
from apps.departments.models import Department  # noqa: F401  re-export


# ==================================================
# Hospital Doctor (link user ↔ hospital)
# ==================================================
class HospitalDoctor(models.Model):
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,  
        blank=True,
        related_name='hospital_doctor_links'
    )
    hospital = models.ForeignKey(
        'hospital.Hospital',
        on_delete=models.CASCADE,
        related_name='doctors'
    )
    department = models.ForeignKey(
        'departments.Department',  # FIX BUG-05: point to canonical apps.departments model
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='department_doctors',  # FIX: dept.department_doctors.filter(is_active=True).count()
    )

    price = models.DecimalField(
        max_digits=8, decimal_places=2,
        null=True, blank=True,
        help_text="Consultation price at this hospital (overrides doctor default)",
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'hospital')

    def clean(self):
        if not getattr(self.user, 'is_doctor', False):
            raise ValidationError("User must be a doctor")

    def __str__(self):
        return f"{self.user} @ {self.hospital}"


# ==================================================
# Hospital Staff
# ==================================================
class HospitalStaff(models.Model):
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,  
        blank=True,
        related_name='hospital_staff_links'
    )
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name='staff'
    )
    role = models.CharField(max_length=50, blank=True)

    class Meta:
        unique_together = ('user', 'hospital')

    def __str__(self):
        return f"{self.user} ({self.role})"


# ==================================================
# Hospital Admin
# ==================================================
class HospitalAdmin(models.Model):
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,  
        blank=True,
        related_name='hospital_admin_links'
    )
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name='admins'
    )

    class Meta:
        unique_together = ('user', 'hospital')

    def __str__(self):
        return f"{self.user} admin @ {self.hospital}"


# ==================================================
# Hospital Assistant
# An assistant can manage appointments across MULTIPLE hospitals
# ==================================================
class HospitalAssistant(models.Model):
    """
    Links an AssistantProfile to one or more hospitals.
    An assistant can simultaneously work in multiple hospitals.
    """

    ROLE_CHOICES = [
        ('receptionist', 'Receptionist'),
        ('coordinator', 'Coordinator'),
        ('supervisor', 'Supervisor'),
    ]

    assistant = models.ForeignKey(
        'assistants.AssistantProfile',
        on_delete=models.CASCADE,
        related_name='hospital_assignments'
    )

    hospital = models.ForeignKey(
        Hospital,
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
        verbose_name = "Hospital Assistant"
        verbose_name_plural = "Hospital Assistants"
        unique_together = ('assistant', 'hospital')
        indexes = [
            models.Index(fields=['assistant', 'is_active']),
            models.Index(fields=['hospital', 'is_active']),
        ]

    def __str__(self):
        return f"{self.assistant.user.username} → {self.hospital.name} ({self.role})"



# ==================================================
# Hospital Documents
# ==================================================
class HospitalDocument(models.Model):
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='hospital_documents'
    )

    file = models.FileField(
        upload_to='hospital_documents/',
        validators=[FileExtensionValidator(['pdf', 'doc', 'docx', 'jpg', 'png'])]
    )

    description = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']
