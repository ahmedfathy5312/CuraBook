"""
CuraBook — Billing Signals
===========================
Auto-creates a free trial when a doctor or hospital_admin registers.
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

logger = logging.getLogger('curabook.billing')

User = settings.AUTH_USER_MODEL


@receiver(post_save, sender=User)
def create_trial_on_registration(sender, instance, created, **kwargs):
    """
    When a new doctor or hospital_admin is created and email is verified,
    automatically start their free trial.
    """
    if not created:
        return

    # Only for paying roles
    if not (instance.is_doctor or instance.hospital_admin):
        return

    # Avoid circular import
    from billing.services import create_free_trial
    from billing.models import Subscription

    # Don't recreate if already exists
    if hasattr(instance, 'subscription'):
        return

    try:
        create_free_trial(instance)
        logger.info('[Billing] Auto-created trial for user=%s role=%s', instance.pk, instance.role)
    except Exception as e:
        logger.error('[Billing] Failed to create trial for user=%s: %s', instance.pk, e)
