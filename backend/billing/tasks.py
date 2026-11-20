"""CuraBook — Billing Celery Tasks"""

import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger('curabook.billing')


@shared_task(name='billing.tasks.expire_trials')
def expire_trials():
    """
    Runs daily. Marks TRIALING subscriptions as EXPIRED when trial_end has passed.
    """
    from .models import Subscription
    now = timezone.now()
    expired = Subscription.objects.filter(
        status=Subscription.Status.TRIALING,
        trial_end__lt=now,
    )
    count = expired.update(status=Subscription.Status.EXPIRED)
    logger.info('[Billing] expire_trials: %d trials expired', count)
    return {'expired': count}


@shared_task(name='billing.tasks.send_trial_expiry_warnings')
def send_trial_expiry_warnings():
    """
    Runs daily. Sends email reminders at 7 days, 3 days, and 1 day before trial expiry.
    """
    from .models import Subscription
    from django.core.mail import send_mail
    from django.conf import settings

    now = timezone.now()
    warning_days = [7, 3, 1]
    sent = 0

    for days in warning_days:
        target_start = now + timezone.timedelta(days=days, hours=-1)
        target_end   = now + timezone.timedelta(days=days, hours=1)
        subs = Subscription.objects.filter(
            status=Subscription.Status.TRIALING,
            trial_end__range=(target_start, target_end),
        ).select_related('owner', 'plan')

        for sub in subs:
            try:
                send_mail(
                    subject=f'CuraBook — Your free trial expires in {days} day{"s" if days > 1 else ""}',
                    message=(
                        f'Hi {sub.owner.display_name},\n\n'
                        f'Your CuraBook free trial expires in {days} day{"s" if days > 1 else ""}.\n'
                        f'Upgrade now to keep your clinic running smoothly:\n'
                        f'{settings.FRONTEND_URL}/billing\n\n'
                        f'Questions? Reply to this email.\n\nThe CuraBook Team'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[sub.owner.email],
                    fail_silently=True,
                )
                sent += 1
            except Exception as e:
                logger.warning('[Billing] Failed to send trial warning to %s: %s', sub.owner.email, e)

    logger.info('[Billing] send_trial_expiry_warnings: %d emails sent', sent)
    return {'sent': sent}


@shared_task(name='billing.tasks.reset_monthly_usage')
def reset_monthly_usage():
    """
    Runs on the 1st of each month at 00:05.
    Creates fresh UsageRecord for the new month.
    (Old records are kept for history — not deleted.)
    """
    from .models import Subscription, UsageRecord
    from django.utils import timezone

    today = timezone.now().date().replace(day=1)
    active_subs = Subscription.objects.filter(
        status__in=[Subscription.Status.ACTIVE, Subscription.Status.TRIALING]
    )
    created = 0
    for sub in active_subs:
        _, was_created = UsageRecord.objects.get_or_create(
            subscription=sub, month=today,
            defaults={'appointments_count': 0, 'clinics_count': 0, 'doctors_count': 0}
        )
        if was_created:
            created += 1

    logger.info('[Billing] reset_monthly_usage: %d usage records created for %s', created, today)
    return {'created': created}


@shared_task(name='billing.tasks.sync_stripe_subscriptions')
def sync_stripe_subscriptions():
    """
    Runs daily. Syncs subscription status from Stripe for past_due subs.
    Catches any webhooks we might have missed.
    """
    from .models import Subscription
    from django.conf import settings

    if getattr(settings, 'BILLING_PROVIDER', 'stripe') == 'mock':
        return {'skipped': 'mock mode'}

    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
    except ImportError:
        return {'skipped': 'stripe not installed'}

    subs = Subscription.objects.filter(
        stripe_subscription_id__isnull=False,
        status__in=[
            Subscription.Status.ACTIVE,
            Subscription.Status.PAST_DUE,
            Subscription.Status.TRIALING,
        ]
    ).exclude(stripe_subscription_id='')

    synced = 0
    for sub in subs:
        try:
            stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
            from .services import _on_subscription_updated
            _on_subscription_updated({'object': stripe_sub})
            synced += 1
        except Exception as e:
            logger.warning('[Billing] Sync failed for sub=%s: %s', sub.id, e)

    logger.info('[Billing] sync_stripe_subscriptions: %d synced', synced)
    return {'synced': synced}
