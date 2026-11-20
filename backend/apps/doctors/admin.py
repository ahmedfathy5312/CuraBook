"""
apps/doctors/admin.py
=====================
Registers DoctorProfile with the Django admin.

search_fields is REQUIRED so other admins can use:
    autocomplete_fields = ('owner',)   ← clinics/admin.py ClinicAdmin
"""

from django.contrib import admin
from .models import DoctorProfile


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    # ── REQUIRED for autocomplete_fields in other admins ─────────
    search_fields = ("user__username", "user__email", "user__full_name", "license_number", "specialty")

    list_display  = ("user", "specialty", "license_number", "gender", "date_of_birth", "accepts_booking", "profile_completed")
    list_filter   = ("specialty", "gender", "accepts_booking", "profile_completed")
    readonly_fields = ("slug", "created_at", "updated_at")
    ordering      = ("user__username",)
