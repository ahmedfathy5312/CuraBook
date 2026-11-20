from django.contrib import admin
from .models import Notification, NotificationPreferences

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ('title', 'user', 'is_read', 'created_at')
    list_filter   = ('is_read', 'type', 'created_at')
    search_fields = ('title', 'user__username', 'body')
    readonly_fields = ('title', 'user', 'type', 'body', 'metadata', 'is_read', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(NotificationPreferences)
class NotificationPreferencesAdmin(admin.ModelAdmin):
    list_display  = ('user', 'in_app_enabled')
    search_fields = ('user__username',)
    readonly_fields = ('user',)
