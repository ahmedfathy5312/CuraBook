from django.contrib import admin
from reports.models import Report

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'type', 'created_at')
    list_filter = ('type', 'created_at')
    search_fields = ('name', 'user__username')
