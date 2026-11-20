from django.contrib import admin
from .models import Prescription, PrescriptionMedication


class PrescriptionMedicationInline(admin.TabularInline):
    model  = PrescriptionMedication
    extra  = 1
    fields = ("name", "dosage", "frequency", "duration", "notes")


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display  = ("id", "doctor", "patient", "status", "created_at", "sent_at")
    list_filter   = ("status",)
    search_fields = ("doctor__username", "patient__username", "diagnosis")
    inlines       = [PrescriptionMedicationInline]
    readonly_fields = ("created_at", "updated_at", "sent_at")
