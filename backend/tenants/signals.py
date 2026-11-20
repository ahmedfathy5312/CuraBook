"""CuraBook — Tenants Signals"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger('curabook.tenants')


@receiver(post_save, sender='billing.Subscription')
def create_tenant_on_activation(sender, instance, **kwargs):
    """
    When a subscription becomes active (trial or paid),
    create a Tenant for the owner if not already present.
    """
    from billing.models import Subscription
    if instance.status not in (Subscription.Status.ACTIVE, Subscription.Status.TRIALING):
        return

    from tenants.services import create_tenant_for_owner
    user = instance.owner
    if not (user.is_doctor or user.hospital_admin):
        return

    try:
        tenant = create_tenant_for_owner(user)
        # Sync feature flags from plan
        tenant.sync_features_from_plan(instance.plan)
        logger.info('[Tenants] Tenant created/updated for user=%s tenant=%s', user.pk, tenant.id)
    except Exception as e:
        logger.error('[Tenants] Failed to create tenant for user=%s: %s', user.pk, e)
