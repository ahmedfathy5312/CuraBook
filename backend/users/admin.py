"""
users/admin.py — Legacy shim admin
====================================
⚠️  This file intentionally registers ONLY the Document model.

All other models previously here (User, DoctorProfile, PatientProfile,
AssistantProfile) have moved to their canonical admin files:
  - apps/accounts/admin.py  → UserAdmin
  - apps/doctors/admin.py   → DoctorProfileAdmin
  - apps/patients/admin.py  → PatientProfileAdmin, PatientRecordAdmin
  - apps/assistants/admin.py → AssistantProfileAdmin

Registering them here again would cause django.contrib.admin.exceptions.AlreadyRegistered.
"""

from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display   = ('owner', 'file', 'description', 'uploaded_at')
    readonly_fields = ('uploaded_at',)
    search_fields  = ('owner__username', 'owner__email', 'description')
    list_filter    = ('uploaded_at',)
    date_hierarchy = 'uploaded_at'
