"""
CuraBook — Audit Log Model
Tracks every critical action across the platform.
"""

from datetime import datetime, date
from django.db import models
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

User = settings.AUTH_USER_MODEL


def _json_safe(value):
    """Recursively make a value JSON-serializable."""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if hasattr(value, 'pk'):        # Django model instance
        return str(value)
    return value


class AuditLog(models.Model):

    class Action(models.TextChoices):
        LOGIN           = 'login',           'تسجيل دخول'
        LOGOUT          = 'logout',          'تسجيل خروج'
        REGISTER        = 'register',        'تسجيل'
        CREATE          = 'create',          'إنشاء'
        UPDATE          = 'update',          'تعديل'
        DELETE          = 'delete',          'حذف'
        BOOKING         = 'booking',         'حجز'
        CONFIRM         = 'confirm',         'تأكيد'
        REJECT          = 'reject',          'رفض'
        CANCEL          = 'cancel',          'إلغاء'
        COMPLETE        = 'complete',        'إكمال'
        SCHEDULE_UPDATE = 'schedule_update', 'تحديث الجدول'
        USER_CREATED    = 'user_created',    'إنشاء مستخدم'
        # ISSUE-014 FIX: added missing actions referenced in AuditSection filter
        TOGGLE          = 'toggle',          'تفعيل/تعطيل'
        VERIFY          = 'verify',          'توثيق'
        VIEW            = 'view',            'عرض'
        EXPORT          = 'export',          'تصدير'

    # Who did it
    actor = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='audit_logs'
    )

    action     = models.CharField(max_length=32, choices=Action.choices, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    # What was affected (generic FK — works for any model)
    content_type   = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    object_id      = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')

    # Diff data
    old_data = models.JSONField(blank=True, null=True)
    new_data = models.JSONField(blank=True, null=True)

    # Free-text context
    metadata = models.JSONField(default=dict, blank=True)
    note     = models.TextField(blank=True)

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes  = [
            models.Index(fields=['actor', 'action']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['content_type', 'object_id']),
        ]
        verbose_name        = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        actor = self.actor.username if self.actor else 'system'
        return f'[{self.timestamp:%Y-%m-%d %H:%M}] {self.action} by {actor}'

    # ─── Class-level factory ─────────────────────
    @classmethod
    def log(
        cls, *,
        actor=None,
        action: str,
        obj=None,
        old_data=None,
        new_data=None,
        metadata: dict = None,
        note: str = '',
        ip_address: str = None,
    ):
        content_type = ContentType.objects.get_for_model(obj) if obj else None
        object_id    = getattr(obj, 'pk', None) if obj else None

        return cls.objects.create(
            actor=actor,
            action=action,
            content_type=content_type,
            object_id=object_id,
            old_data=_json_safe(old_data),
            new_data=_json_safe(new_data),
            metadata=_json_safe(metadata or {}),
            note=note,
            ip_address=ip_address,
        )
