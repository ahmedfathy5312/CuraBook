from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True, default=None)
    action_display = serializers.SerializerMethodField(read_only=True)
    user = serializers.SerializerMethodField(read_only=True)
    user_role = serializers.SerializerMethodField(read_only=True)
    target = serializers.SerializerMethodField(read_only=True)
    description = serializers.SerializerMethodField(read_only=True)

    ACTION_LABELS = {
        'login': 'تسجيل دخول',
        'logout': 'تسجيل خروج',
        'register': 'تسجيل حساب',
        'create': 'إنشاء',
        'update': 'تحديث',
        'delete': 'حذف',
        'booking': 'حجز',
        'confirm': 'تأكيد',
        'reject': 'رفض',
        'cancel': 'إلغاء',
        'complete': 'إكمال',
        'schedule_update': 'تحديث الجدول',
        'user_created': 'إنشاء مستخدم',
        'toggle': 'تفعيل/تعطيل',
        'verify': 'توثيق',
        'view': 'عرض',
        'export': 'تصدير',
    }

    ROLE_LABELS = {
        'doctor': 'طبيب',
        'patient': 'مريض',
        'assistant': 'مساعد',
        'hospital': 'مستشفى',
        'hospital_admin': 'مستشفى',
        'admin': 'مدير نظام',
        'system_admin': 'مدير نظام',
    }

    class Meta:
        model  = AuditLog
        fields = (
            'id', 'actor', 'actor_username', 'user', 'user_role',
            'action', 'action_display',
            'content_type', 'object_id', 'target', 'description',
            'old_data', 'new_data', 'metadata',
            'note', 'ip_address', 'timestamp',
        )
        read_only_fields = fields

    def get_action_display(self, obj):
        return self.ACTION_LABELS.get(obj.action, obj.action or '')

    def get_user(self, obj):
        actor = obj.actor
        if actor:
            return (
                getattr(actor, 'full_name', None)
                or getattr(actor, 'username', None)
                or getattr(actor, 'email', None)
                or str(actor.pk)
            )

        metadata = obj.metadata or {}
        identifier = (
            metadata.get('identifier')
            or metadata.get('username')
            or metadata.get('email')
            or metadata.get('actor')
        )
        if identifier:
            return str(identifier)
        return 'النظام'

    def get_user_role(self, obj):
        actor = obj.actor
        if not actor:
            return 'النظام'

        role = getattr(actor, 'current_role', None) or getattr(actor, 'role', '')
        if callable(role):
            role = role()

        if getattr(actor, 'is_platform_admin', False) or getattr(actor, 'is_superuser', False):
            role = 'admin'
        elif getattr(actor, 'hospital_admin', False):
            role = 'hospital_admin'
        elif getattr(actor, 'is_doctor', False):
            role = 'doctor'
        elif getattr(actor, 'is_patient', False):
            role = 'patient'
        elif getattr(actor, 'is_assistant', False):
            role = 'assistant'

        return self.ROLE_LABELS.get(role, role or 'مستخدم')

    def get_target(self, obj):
        if obj.content_object is not None:
            return str(obj.content_object)

        metadata = obj.metadata or {}
        new_data = obj.new_data or {}
        old_data = obj.old_data or {}
        for key in (
            'target', 'object', 'entity', 'patient_name', 'doctor_name',
            'hospital_name', 'appointment_id', 'booking_id', 'slot_id',
            'user_id', 'patient_id', 'doctor_id',
        ):
            value = metadata.get(key) or new_data.get(key) or old_data.get(key)
            if value:
                return str(value)

        if obj.content_type and obj.object_id:
            return f'{obj.content_type.model} #{obj.object_id}'
        return 'النظام'

    def get_description(self, obj):
        if obj.note:
            return obj.note

        metadata = obj.metadata or {}
        for key in ('description', 'detail', 'message', 'reason'):
            if metadata.get(key):
                return str(metadata[key])

        changed = []
        old_data = obj.old_data or {}
        new_data = obj.new_data or {}
        for key, new_value in new_data.items():
            old_value = old_data.get(key)
            if old_value != new_value:
                changed.append(f'{key}: {old_value} -> {new_value}')

        if changed:
            return '; '.join(changed[:3])
        return self.get_action_display(obj)
