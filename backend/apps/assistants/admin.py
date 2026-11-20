"""
apps/assistants/admin.py
"""

from django.contrib import admin
from .models import AssistantProfile, AssistantShift


@admin.register(AssistantProfile)
class AssistantProfileAdmin(admin.ModelAdmin):
    search_fields = ("user__username", "user__email", "user__full_name")
    list_display  = ("user", "can_manage_appointments", "can_upload_documents", "can_edit_schedule")
    list_filter   = ("can_manage_appointments", "can_upload_documents", "can_edit_schedule")
    ordering      = ("user__username",)


@admin.register(AssistantShift)
class AssistantShiftAdmin(admin.ModelAdmin):
    list_display  = ('assistant', 'date', 'start_time', 'end_time', 'place_name', 'status')
    list_filter   = ('status', 'date')
    search_fields = ('assistant__user__username', 'place_name', 'doctor_name')
    ordering      = ('-date', 'start_time')
