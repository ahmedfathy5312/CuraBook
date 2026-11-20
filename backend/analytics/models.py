from django.db import models


class PlatformSettings(models.Model):
    """
    Singleton model for platform-wide admin settings.
    Only one row should exist (pk=1). Use get_or_create() to access it.
    """
    platform_name     = models.CharField(max_length=120, default='CuraBook')
    language          = models.CharField(max_length=10,  default='ar')
    timezone          = models.CharField(max_length=60,  default='Africa/Cairo')
    currency          = models.CharField(max_length=10,  default='EGP')
    cancel_window     = models.IntegerField(default=24,  help_text='Hours before appt that cancellation is allowed')
    max_reschedule    = models.IntegerField(default=2,   help_text='Max reschedules per appointment')
    slot_duration     = models.IntegerField(default=30,  help_text='Default slot duration in minutes')
    maintenance_mode  = models.BooleanField(default=False)

    # Notification preferences (stored as booleans)
    notify_new_booking      = models.BooleanField(default=True)
    notify_cancellation     = models.BooleanField(default=True)
    notify_new_user         = models.BooleanField(default=False)
    notify_system_alerts    = models.BooleanField(default=True)
    notify_low_rating       = models.BooleanField(default=True)
    notify_daily_summary    = models.BooleanField(default=False)

    # Appearance preferences
    theme         = models.CharField(max_length=20, default='system')
    font_size     = models.CharField(max_length=10, default='md')
    sidebar_style = models.CharField(max_length=20, default='dark')

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Platform Settings'
        verbose_name_plural = 'Platform Settings'

    def __str__(self):
        return f'PlatformSettings ({self.platform_name})'

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
