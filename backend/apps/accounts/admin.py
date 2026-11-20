"""
apps/accounts/admin.py
======================
Registers the User model with the Django admin site.

This file MUST exist so that other apps (e.g. clinics) can use
    autocomplete_fields = ('user',)
without triggering admin.E039.

Rule: autocomplete_fields requires the referenced model's ModelAdmin
to declare search_fields.  We define them here on UserAdmin.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # ── List view ────────────────────────────────────────────────
    list_display = (
        "username", "email", "full_name", "phone", "city",
        "role", "is_active", "is_staff",
        "is_doctor", "is_patient", "is_assistant", "hospital_admin",
    )
    list_filter = (
        "is_active", "is_staff", "role",
        "is_doctor", "is_patient", "is_assistant", "hospital_admin",
    )
    ordering = ("username",)

    # ── REQUIRED for autocomplete_fields in other admins ─────────
    search_fields = ("username", "email", "full_name", "phone")

    # ── Detail view ──────────────────────────────────────────────
    fieldsets = (
        (None, {"fields": ("username", "email", "password")}),
        (_("Personal info"), {"fields": ("full_name", "phone", "city")}),
        (_("Role"), {"fields": ("role",)}),
        (_("Role flags"), {"fields": (
            "is_patient", "is_doctor", "is_assistant",
            "hospital_admin", "is_platform_admin",
        )}),
        (_("Permissions"), {"fields": (
            "is_active", "is_staff", "is_deleted",
            "groups", "user_permissions",
        )}),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "password1", "password2"),
        }),
    )
    readonly_fields = ("last_login", "date_joined")
