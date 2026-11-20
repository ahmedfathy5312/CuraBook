from django.contrib import admin
from django.urls import path
from django.shortcuts import render
from django.contrib.admin.views.decorators import staff_member_required

from .services import (
    get_global_analytics,
)


@admin.register(admin.models.LogEntry)
class AnalyticsDashboardAdmin(admin.ModelAdmin):
    """
    Fake model to attach analytics dashboard to admin
    """
    change_list_template = "analytics/dashboard.html"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        analytics = get_global_analytics()

        context = {
            **analytics,
            "title": "System Analytics Dashboard",
        }

        return render(
            request,
            "analytics/dashboard.html",
            context
        )
