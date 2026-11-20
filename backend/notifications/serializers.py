from rest_framework import serializers
from .models import Notification, NotificationPreferences


class NotificationSerializer(serializers.ModelSerializer):

    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model  = Notification
        fields = (
            'id',
            'type',
            'type_display',
            'title',
            'body',
            'is_read',
            'metadata',
            'created_at',
        )
        read_only_fields = fields


class NotificationPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NotificationPreferences
        fields = ('email_enabled', 'push_enabled', 'in_app_enabled')
