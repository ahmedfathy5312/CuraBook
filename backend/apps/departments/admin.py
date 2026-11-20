"""
apps/departments/admin.py
"""

from django.contrib import admin
from .models import Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    search_fields = ("name", "hospital__name")
    list_display  = ("name", "hospital", "is_active")
    list_filter   = ("is_active", "hospital")
    ordering      = ("hospital", "name")
