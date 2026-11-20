from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display  = ('action', 'actor', 'content_type', 'timestamp')
    search_fields = ('actor__username', 'action')
    list_filter   = ('action', 'timestamp')
    readonly_fields = (
        'actor', 'action', 'content_type', 'object_id',
        'old_data', 'new_data', 'metadata', 'ip_address', 'timestamp',
    )
    date_hierarchy = 'timestamp'

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
