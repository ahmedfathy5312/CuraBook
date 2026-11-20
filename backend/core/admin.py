from django.contrib import admin
from .models import BlockedIP
from .ip_blocking import block_ip, unblock_ip


@admin.register(BlockedIP)
class BlockedIPAdmin(admin.ModelAdmin):
    list_display  = ('ip_address', 'reason', 'blocked_at', 'expires_at', 'blocked_by', 'is_active_display')
    list_filter   = ('blocked_by',)
    search_fields = ('ip_address', 'reason')
    readonly_fields = ('blocked_at',)
    ordering = ('-blocked_at',)

    actions = ['unblock_selected']

    @admin.display(boolean=True, description='Active?')
    def is_active_display(self, obj):
        return obj.is_active()

    @admin.action(description='Unblock selected IPs')
    def unblock_selected(self, request, queryset):
        count = 0
        for entry in queryset:
            if unblock_ip(entry.ip_address):
                count += 1
        self.message_user(request, f'{count} IP(s) unblocked successfully.')
