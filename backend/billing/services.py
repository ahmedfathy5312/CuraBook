"""
CuraBook — Billing Services
============================
All Stripe API calls live here — views never call Stripe directly.

Swap BILLING_PROVIDER=paymob and implement PaymobGateway to change provider.
"""

import logging
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from .models import Invoice, Plan, Subscription, UsageRecord

logger = logging.getLogger('curabook.billing')


# ─────────────────────────────────────────────────────────────────────────────
# Stripe gateway (lazy import — only loads if stripe is installed)
# ─────────────────────────────────────────────────────────────────────────────

def _stripe():
    """Lazy Stripe import — raises clear error if not installed."""
    try:
        import stripe as _s
        _s.api_key = settings.STRIPE_SECRET_KEY
        return _s
    except ImportError:
        raise RuntimeError(
            "stripe package not installed. Run: pip install stripe "
            "or set BILLING_PROVIDER=mock for development."
        )


def _is_mock() -> bool:
    return getattr(settings, 'BILLING_PROVIDER', 'stripe') == 'mock'


# ─────────────────────────────────────────────────────────────────────────────
# Subscription management
# ─────────────────────────────────────────────────────────────────────────────

def create_free_trial(user) -> Subscription:
    """
    Called immediately after a doctor/hospital_admin registers.
    Creates a 14-day free trial subscription automatically.
    No payment method required.
    """
    if hasattr(user, 'subscription'):
        return user.subscription  # already has one

    plan = Plan.objects.filter(tier=Plan.Tier.FREE_TRIAL, is_active=True).first()
    if not plan:
        # Fallback: create default trial plan if seed hasn't run
        plan = Plan.objects.create(
            name='Free Trial',
            tier=Plan.Tier.FREE_TRIAL,
            price_monthly=Decimal('0.00'),
            price_yearly=Decimal('0.00'),
            trial_days=14,
            max_clinics=1,
            max_doctors=1,
            max_appointments_per_month=30,
            has_analytics=False,
            has_sms_reminders=False,
        )

    now = timezone.now()
    sub = Subscription.objects.create(
        owner=user,
        plan=plan,
        status=Subscription.Status.TRIALING,
        trial_start=now,
        trial_end=now + timedelta(days=plan.trial_days or 14),
        current_period_start=now,
        current_period_end=now + timedelta(days=plan.trial_days or 14),
    )
    logger.info('[Billing] Free trial created for user=%s sub=%s', user.pk, sub.id)
    return sub


def get_or_create_stripe_customer(subscription: Subscription) -> str:
    """Create (or retrieve) a Stripe Customer for this subscriber."""
    if subscription.stripe_customer_id:
        return subscription.stripe_customer_id

    if _is_mock():
        cid = f'cus_mock_{subscription.owner.pk}'
        subscription.stripe_customer_id = cid
        subscription.save(update_fields=['stripe_customer_id'])
        return cid

    stripe = _stripe()
    customer = stripe.Customer.create(
        email=subscription.owner.email,
        name=subscription.owner.display_name,
        metadata={'user_id': str(subscription.owner.pk)},
    )
    subscription.stripe_customer_id = customer.id
    subscription.save(update_fields=['stripe_customer_id'])
    logger.info('[Billing] Stripe customer created cus=%s user=%s', customer.id, subscription.owner.pk)
    return customer.id


def create_checkout_session(subscription: Subscription, plan: Plan, interval: str, success_url: str, cancel_url: str) -> str:
    """
    Create a Stripe Checkout session and return the URL.
    The user is redirected here to enter payment details.
    """
    if _is_mock():
        return f'{success_url}?mock=1&plan={plan.tier}&interval={interval}'

    stripe = _stripe()
    customer_id = get_or_create_stripe_customer(subscription)
    price_id = plan.stripe_price_id_for_interval(interval)

    if not price_id:
        raise ValueError(f'Plan {plan.tier} has no Stripe price ID for interval={interval}')

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=['card'],
        line_items=[{'price': price_id, 'quantity': 1}],
        mode='subscription',
        success_url=success_url + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url=cancel_url,
        metadata={
            'subscription_id': str(subscription.id),
            'plan_tier': plan.tier,
            'interval': interval,
        },
        subscription_data={
            'trial_period_days': None,  # trial already started
            'metadata': {'subscription_id': str(subscription.id)},
        },
        allow_promotion_codes=True,
    )
    logger.info('[Billing] Checkout session created cs=%s user=%s', session.id, subscription.owner.pk)
    return session.url


def cancel_subscription(subscription: Subscription, at_period_end: bool = True) -> Subscription:
    """
    Cancel a Stripe subscription.
    at_period_end=True → user keeps access until next billing date (recommended).
    at_period_end=False → immediate cancellation.
    """
    if not _is_mock() and subscription.stripe_subscription_id:
        stripe = _stripe()
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=at_period_end,
        )

    if at_period_end:
        subscription.cancel_at_period_end = True
        subscription.cancelled_at = timezone.now()
        subscription.save(update_fields=['cancel_at_period_end', 'cancelled_at'])
    else:
        subscription.status = Subscription.Status.CANCELLED
        subscription.cancelled_at = timezone.now()
        subscription.save(update_fields=['status', 'cancelled_at'])

    logger.info('[Billing] Subscription cancelled sub=%s at_period_end=%s', subscription.id, at_period_end)
    return subscription


def reactivate_subscription(subscription: Subscription) -> Subscription:
    """Undo a pending cancellation (before period end)."""
    if not _is_mock() and subscription.stripe_subscription_id:
        stripe = _stripe()
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=False,
        )

    subscription.cancel_at_period_end = False
    subscription.cancelled_at = None
    subscription.save(update_fields=['cancel_at_period_end', 'cancelled_at'])
    return subscription


def upgrade_plan(subscription: Subscription, new_plan: Plan, interval: str) -> str:
    """
    Upgrade/downgrade to a new plan mid-cycle.
    Returns checkout URL for payment if needed, or '' if no payment required.
    """
    if _is_mock():
        subscription.plan = new_plan
        subscription.interval = interval
        subscription.status = Subscription.Status.ACTIVE
        subscription.save(update_fields=['plan', 'interval', 'status'])
        return ''

    if not subscription.stripe_subscription_id:
        # Never had Stripe — create checkout
        domain = settings.FRONTEND_URL
        return create_checkout_session(
            subscription, new_plan, interval,
            success_url=f'{domain}/billing/success',
            cancel_url=f'{domain}/billing',
        )

    stripe = _stripe()
    price_id = new_plan.stripe_price_id_for_interval(interval)
    stripe_sub = stripe.Subscription.retrieve(subscription.stripe_subscription_id)

    stripe.Subscription.modify(
        subscription.stripe_subscription_id,
        items=[{'id': stripe_sub['items']['data'][0]['id'], 'price': price_id}],
        proration_behavior='always_invoice',
        metadata={'plan_tier': new_plan.tier},
    )

    subscription.plan = new_plan
    subscription.interval = interval
    subscription.save(update_fields=['plan', 'interval'])
    return ''


# ─────────────────────────────────────────────────────────────────────────────
# Webhook event handlers (called by WebhookView)
# ─────────────────────────────────────────────────────────────────────────────

def handle_webhook_event(event_type: str, data: dict) -> None:
    """
    Route Stripe webhook events to the right handler.
    All DB mutations happen here — views only verify signature.
    """
    handlers = {
        'checkout.session.completed':       _on_checkout_completed,
        'customer.subscription.updated':    _on_subscription_updated,
        'customer.subscription.deleted':    _on_subscription_deleted,
        'invoice.paid':                     _on_invoice_paid,
        'invoice.payment_failed':           _on_invoice_failed,
    }
    handler = handlers.get(event_type)
    if handler:
        handler(data)
    else:
        logger.debug('[Billing] Unhandled webhook event: %s', event_type)


def _on_checkout_completed(data: dict) -> None:
    session = data.get('object', {})
    sub_id = session.get('metadata', {}).get('subscription_id')
    if not sub_id:
        return

    try:
        sub = Subscription.objects.get(id=sub_id)
    except Subscription.DoesNotExist:
        logger.warning('[Billing] Checkout completed for unknown sub_id=%s', sub_id)
        return

    stripe_sub_id = session.get('subscription')
    plan_tier     = session.get('metadata', {}).get('plan_tier')
    interval      = session.get('metadata', {}).get('interval', 'monthly')

    if stripe_sub_id:
        sub.stripe_subscription_id = stripe_sub_id

    if plan_tier:
        plan = Plan.objects.filter(tier=plan_tier).first()
        if plan:
            sub.plan = plan

    sub.interval = interval
    sub.status   = Subscription.Status.ACTIVE
    sub.save()
    logger.info('[Billing] Checkout completed — sub=%s activated', sub.id)


def _on_subscription_updated(data: dict) -> None:
    stripe_sub = data.get('object', {})
    stripe_sub_id = stripe_sub.get('id')

    try:
        sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
    except Subscription.DoesNotExist:
        return

    status_map = {
        'active':    Subscription.Status.ACTIVE,
        'trialing':  Subscription.Status.TRIALING,
        'past_due':  Subscription.Status.PAST_DUE,
        'canceled':  Subscription.Status.CANCELLED,
        'unpaid':    Subscription.Status.UNPAID,
    }
    new_status = status_map.get(stripe_sub.get('status'), sub.status)

    import datetime
    current_period_start = datetime.datetime.fromtimestamp(
        stripe_sub['current_period_start'], tz=timezone.utc
    ) if stripe_sub.get('current_period_start') else None
    current_period_end = datetime.datetime.fromtimestamp(
        stripe_sub['current_period_end'], tz=timezone.utc
    ) if stripe_sub.get('current_period_end') else None

    sub.status = new_status
    sub.cancel_at_period_end = stripe_sub.get('cancel_at_period_end', False)
    if current_period_start:
        sub.current_period_start = current_period_start
    if current_period_end:
        sub.current_period_end = current_period_end
    sub.save()
    logger.info('[Billing] Subscription updated sub=%s status=%s', sub.id, new_status)


def _on_subscription_deleted(data: dict) -> None:
    stripe_sub = data.get('object', {})
    try:
        sub = Subscription.objects.get(stripe_subscription_id=stripe_sub.get('id'))
        sub.status = Subscription.Status.EXPIRED
        sub.save(update_fields=['status'])
        logger.info('[Billing] Subscription expired sub=%s', sub.id)
    except Subscription.DoesNotExist:
        pass


def _on_invoice_paid(data: dict) -> None:
    inv_data = data.get('object', {})
    stripe_sub_id = inv_data.get('subscription')

    try:
        sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
    except Subscription.DoesNotExist:
        return

    import datetime
    Invoice.objects.update_or_create(
        stripe_invoice_id=inv_data['id'],
        defaults=dict(
            subscription=sub,
            amount=Decimal(str(inv_data['amount_paid'] / 100)),
            currency=inv_data.get('currency', 'egp').upper(),
            status=Invoice.Status.PAID,
            period_start=datetime.datetime.fromtimestamp(inv_data['period_start'], tz=timezone.utc),
            period_end=datetime.datetime.fromtimestamp(inv_data['period_end'], tz=timezone.utc),
            paid_at=timezone.now(),
            hosted_invoice_url=inv_data.get('hosted_invoice_url', ''),
            invoice_pdf=inv_data.get('invoice_pdf', ''),
        ),
    )
    logger.info('[Billing] Invoice paid sub=%s amount=%s', sub.id, inv_data['amount_paid'])


def _on_invoice_failed(data: dict) -> None:
    inv_data = data.get('object', {})
    stripe_sub_id = inv_data.get('subscription')

    try:
        sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
        sub.status = Subscription.Status.PAST_DUE
        sub.save(update_fields=['status'])
        logger.warning('[Billing] Invoice payment failed sub=%s', sub.id)
    except Subscription.DoesNotExist:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Usage tracking
# ─────────────────────────────────────────────────────────────────────────────

def get_or_create_usage(subscription: Subscription) -> UsageRecord:
    """Get current month's usage record."""
    today = timezone.now().date().replace(day=1)
    record, _ = UsageRecord.objects.get_or_create(
        subscription=subscription,
        month=today,
        defaults={
            'appointments_count': 0,
            'clinics_count': 0,
            'doctors_count': 0,
        }
    )
    return record


def increment_appointment_usage(user) -> bool:
    """
    Called when a new appointment is booked.
    Returns True if within limit, False if limit exceeded.
    """
    try:
        sub = user.subscription
    except Subscription.DoesNotExist:
        return False

    if not sub.is_active:
        return False

    limit = sub.plan.max_appointments_per_month
    if limit == 0:
        return True  # unlimited

    usage = get_or_create_usage(sub)
    if usage.appointments_count >= limit:
        return False

    UsageRecord.objects.filter(pk=usage.pk).update(
        appointments_count=models.F('appointments_count') + 1
    )
    return True


def check_clinic_limit(user) -> bool:
    """Returns True if user can create another clinic."""
    try:
        sub = user.subscription
    except Subscription.DoesNotExist:
        return False

    limit = sub.plan.max_clinics
    if limit == 0:
        return True

    from clinics.models import Clinic
    current = Clinic.objects.filter(owner__user=user, is_deleted=False).count()
    return current < limit
