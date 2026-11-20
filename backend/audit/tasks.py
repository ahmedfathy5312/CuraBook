"""
CuraBook — Audit Celery Tasks
"""

import logging
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from datetime import timedelta

logger = logging.getLogger('curabook')


def _retention_days() -> int:
    """Return audit log retention period in days from settings."""
    years = getattr(settings, 'AUDIT_LOG_RETENTION_YEARS', 3)
    return years * 365


@shared_task(name='audit.tasks.cleanup_old_logs')
def cleanup_old_logs(days: int = None):
    """
    Runs monthly (Beat schedule).
    Deletes audit logs older than AUDIT_LOG_RETENTION_YEARS (default 3 years).
    """
    from .models import AuditLog

    if days is None:
        days = _retention_days()

    cutoff = timezone.now() - timedelta(days=days)
    deleted, _ = AuditLog.objects.filter(timestamp__lt=cutoff).delete()

    logger.info(
        '[Celery] cleanup_old_logs: deleted %d logs older than %d days '
        '(retention=%d years)',
        deleted, days, days // 365
    )
    return {'deleted': deleted, 'retention_days': days}


@shared_task(name='audit.tasks.cleanup_old_audit_logs')
def cleanup_old_audit_logs(days: int = None):
    """
    Alias for cleanup_old_logs — used by Celery Beat schedule.
    """
    return cleanup_old_logs(days)


@shared_task(name='audit.tasks.anonymise_deleted_patients')
def anonymise_deleted_patients():
    """
    Runs monthly. Anonymises PII for soft-deleted patient accounts
    older than DATA_RETENTION_YEARS to comply with GDPR right-to-erasure.
    Hard medical records (appointments) are kept anonymised for legal retention period.
    """
    from django.contrib.auth import get_user_model
    import uuid

    User = get_user_model()
    years = getattr(settings, 'DATA_RETENTION_YEARS', 7)
    cutoff = timezone.now() - timedelta(days=years * 365)

    # Find soft-deleted users whose grace period has expired
    qs = User.objects.filter(
        is_active=False,
        date_joined__lt=cutoff,
        email__startswith='REDACTED_',  # skip already anonymised
    ).exclude(email__startswith='REDACTED_')

    count = 0
    for user in qs:
        anon_id = str(uuid.uuid4())[:8]
        user.first_name = 'REDACTED'
        user.last_name  = 'REDACTED'
        user.email      = f'REDACTED_{anon_id}@deleted.invalid'
        user.username   = f'deleted_{anon_id}'
        user.phone      = ''
        user.save(update_fields=['first_name', 'last_name', 'email', 'username'])
        count += 1

    logger.info('[Celery] anonymise_deleted_patients: anonymised %d users', count)
    return {'anonymised': count}

