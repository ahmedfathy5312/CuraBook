"""
CuraBook — users (Legacy Compatibility App)
============================================
⚠️  This app is DEPRECATED.
Auth is now handled by: apps.accounts (label='accounts')
Profile domains: apps.doctors, apps.patients, apps.assistants

Kept only for:
  - auth_backends.UsernameOrEmailBackend
  - Legacy import compatibility
  - Celery task routing (send_activation_email)
"""
from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"
    label = "users_legacy"   # ← Unique label prevents model conflicts
    verbose_name = "Users (Legacy — use apps.accounts)"

    def ready(self):
        # DO NOT import users.signals — accounts.signals handles this now
        pass
