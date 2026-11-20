from django.contrib import admin
from django.utils.html import format_html

from .models import SearchLog


@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    """
    Admin dashboard for Search Logs
    - Read-only
    - Optimized for analytics & monitoring
    """

    # =============================
    # List View
    # =============================
    list_display = (
        'query',
        'search_type',
        'user_display',
        'ip_address',
        'created_at',
    )

    list_filter = (
        'search_type',
        'created_at',
    )

    search_fields = (
        'query',
        'user__username',
        'user__email',
    )

    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    # =============================
    # Detail View (Read-only)
    # =============================
    readonly_fields = (
        'user',
        'query',
        'search_type',
        'ip_address',
        'user_agent',
        'created_at',
    )

    # =============================
    # Custom Display
    # =============================
    def user_display(self, obj):
        if obj.user:
            return format_html(
                "<strong>{}</strong>",
                obj.user.username
            )
        return format_html("<em>Anonymous</em>")

    user_display.short_description = "User"
    user_display.admin_order_field = 'user__username'

    # =============================
    # Permissions (Read-only Admin)
    # =============================
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
