"""
CuraBook — Accounts Domain
===========================
Responsible ONLY for:
  - User model (authentication identity)
  - Custom UserManager

Domain-specific profiles live in their own apps:
  - apps.doctors   → DoctorProfile
  - apps.patients  → PatientProfile
  - apps.assistants → AssistantProfile
"""

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

from .managers import UserManager

phone_validator = RegexValidator(
    regex=r"^\+?\d{7,15}$",
    message="Enter a valid phone number (7-15 digits, optional +).",
)


class User(AbstractBaseUser, PermissionsMixin):
    """
    CuraBook custom User model.
    Stores ONLY authentication + identity data.
    Role-specific data lives in domain profile apps.
    """

    ROLE_CHOICES = [
        ("doctor",         "Doctor"),
        ("patient",        "Patient"),
        ("assistant",      "Assistant"),
        ("hospital_admin", "Hospital Admin"),
        ("admin",          "System Admin"),
    ]

    # ── Identity ──────────────────────────────────────────────────
    username      = models.CharField(max_length=150, unique=True)
    email         = models.EmailField(unique=True)
    full_name     = models.CharField(max_length=255, blank=True)
    # FIX G: Bilingual name — stores Latin/English version of the doctor's name.
    # Used by getLocalizedName.js when UI is in English mode.
    # Populated during registration or profile update.
    full_name_en  = models.CharField(max_length=255, blank=True, null=True,
                                     help_text="Latin/English name for English UI display")
    phone         = models.CharField(
        max_length=20, blank=True, null=True,
        validators=[phone_validator], unique=True,
    )
    city       = models.CharField(max_length=100, blank=True, null=True)

    # ── Role ──────────────────────────────────────────────────────
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, blank=True, db_index=True)

    # ── Role flags (fast permission checks without DB joins) ──────
    is_patient        = models.BooleanField(default=False)
    is_doctor         = models.BooleanField(default=False)
    is_assistant      = models.BooleanField(default=False)
    hospital_admin    = models.BooleanField(default=False)
    is_platform_admin = models.BooleanField(default=False)

    # ── Status ────────────────────────────────────────────────────
    is_active    = models.BooleanField(default=False)   # False until email verified
    is_staff     = models.BooleanField(default=False)
    is_deleted   = models.BooleanField(default=False)   # Soft delete
    date_joined  = models.DateTimeField(default=timezone.now)
    last_login   = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD  = "username"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        verbose_name        = "User"
        verbose_name_plural = "Users"
        indexes = [
            models.Index(fields=["username"]),
            models.Index(fields=["email"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self):
        return f"{self.username} ({self.email})"

    @property
    def current_role(self) -> str:
        """
        Normalized role string for frontend consumption.
        FIX B-01: Returns "hospital" (not "hospital_admin") so the frontend
        AuthContext ROLE_ROUTES map resolves to /hospital-dashboard correctly.
        """
        if self.is_doctor:
            return "doctor"
        if self.is_patient:
            return "patient"
        if self.is_assistant:
            return "assistant"
        if self.hospital_admin or self.role == "hospital_admin":
            return "hospital"   # ← FIX: frontend expects "hospital" not "hospital_admin"
        if self.is_platform_admin or self.role == "admin":
            return "admin"
        return self.role or "patient"

    @property
    def display_name(self) -> str:
        return self.full_name or self.username
