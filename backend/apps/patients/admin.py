"""
apps/patients/admin.py
"""

from django.contrib import admin
from .models import PatientProfile, PatientRecord


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    search_fields = ("user__username", "user__email", "user__full_name")
    list_display  = ("user", "dob", "gender", "age")
    list_filter   = ("gender",)
    ordering      = ("user__username",)


@admin.register(PatientRecord)
class PatientRecordAdmin(admin.ModelAdmin):
    search_fields = ("medical_id", "patient__username", "doctor__username", "diagnosis")
    list_display  = ("medical_id", "patient", "doctor", "visit_date", "blood_type")
    list_filter   = ("blood_type", "visit_date")
    readonly_fields = ("medical_id", "created_at", "updated_at")
    ordering      = ("-created_at",)
