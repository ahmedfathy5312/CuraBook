"""
CuraBook — Billing Domain
==========================
Manages subscription plans, subscriptions, and invoices.

Tenant = the subscriber. A Doctor subscribes for their clinic.
A Hospital admin subscribes for their hospital.

Plans:
  free_trial  → 14 days, 1 clinic, limited features
  starter     → monthly, 1 clinic, full features
  pro         → monthly, 3 clinics, analytics
  enterprise  → monthly, unlimited clinics, white-label

Payment provider: Stripe (swap BILLING_PROVIDER env var for Paymob).
"""

import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


User = settings.AUTH_USER_MODEL


# ─────────────────────────────────────────────────────────────────────────────
# Plan
# ─────────────────────────────────────────────────────────────────────────────

class Plan(models.Model):
    """
    Subscription plan catalogue.
    Managed by platform admins (via Django admin or seed command).
    """

    class Tier(models.TextChoices):
        FREE_TRIAL = 'free_trial', 'Free Trial'
        STARTER    = 'starter',    'Starter'
        PRO        = 'pro',        'Pro'
        ENTERPRISE = 'enterprise', 'Enterprise'

    class Interval(models.TextChoices):
        MONTHLY = 'monthly', 'Monthly'
        YEARLY  = 'yearly',  'Yearly'

    name             = models.CharField(max_length=100)
    tier             = models.CharField(max_length=20, choices=Tier.choices, unique=True)
    price_monthly    = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'))
    price_yearly     = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'))
    currency         = models.CharField(max_length=3, default='EGP')
    trial_days       = models.PositiveIntegerField(default=0)

    # Limits
    max_clinics      = models.PositiveIntegerField(default=1,  help_text="0 = unlimited")
    max_doctors      = models.PositiveIntegerField(default=1,  help_text="0 = unlimited")
    max_appointments_per_month = models.PositiveIntegerField(default=50, help_text="0 = unlimited")

    # Feature flags (checked by billing middleware)
    has_analytics       = models.BooleanField(default=False)
    has_sms_reminders   = models.BooleanField(default=True)
    has_custom_branding = models.BooleanField(default=False)
    has_api_access      = models.BooleanField(default=False)

    # Stripe
    stripe_price_id_monthly = models.CharField(max_length=100, blank=True)
    stripe_price_id_yearly  = models.CharField(max_length=100, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['price_monthly']

    def __str__(self):
        return f"{self.name} ({self.tier})"

    def price_for_interval(self, interval: str) -> Decimal:
        return self.price_yearly if interval == 'yearly' else self.price_monthly

    def stripe_price_id_for_interval(self, interval: str) -> str:
        return (
            self.stripe_price_id_yearly
            if interval == 'yearly'
            else self.stripe_price_id_monthly
        )


# ─────────────────────────────────────────────────────────────────────────────
# Subscription
# ─────────────────────────────────────────────────────────────────────────────

class Subscription(models.Model):
    """
    One subscription per tenant (doctor or hospital_admin).
    Links the user → plan → Stripe subscription.
    """

    class Status(models.TextChoices):
        TRIALING   = 'trialing',   'Trialing'
        ACTIVE     = 'active',     'Active'
        PAST_DUE   = 'past_due',   'Past Due'
        CANCELLED  = 'cancelled',  'Cancelled'
        EXPIRED    = 'expired',    'Expired'
        UNPAID     = 'unpaid',     'Unpaid'

    class Interval(models.TextChoices):
        MONTHLY = 'monthly', 'Monthly'
        YEARLY  = 'yearly',  'Yearly'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Who subscribes
    owner = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='subscription',
        help_text="Doctor or HospitalAdmin who pays"
    )

    plan     = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name='subscriptions')
    interval = models.CharField(max_length=10, choices=Interval.choices, default=Interval.MONTHLY)
    status   = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIALING)

    # Dates
    trial_start  = models.DateTimeField(null=True, blank=True)
    trial_end    = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end   = models.DateTimeField(null=True, blank=True)
    cancelled_at         = models.DateTimeField(null=True, blank=True)

    # Stripe
    stripe_customer_id     = models.CharField(max_length=100, blank=True, db_index=True)
    stripe_subscription_id = models.CharField(max_length=100, blank=True, db_index=True)
    paymob_order_id        = models.CharField(max_length=100, blank=True, db_index=True)  # Paymob order ref

    # Cancel at period end (graceful cancellation)
    cancel_at_period_end = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['current_period_end']),
        ]

    def __str__(self):
        return f"{self.owner.username} — {self.plan.name} ({self.status})"

    # ── Convenience checks ────────────────────────────────────────

    @property
    def is_active(self) -> bool:
        """Returns True if the subscription allows access."""
        if self.status in (self.Status.ACTIVE, self.Status.TRIALING):
            return True
        if self.status == self.Status.PAST_DUE:
            # Grace period: still active for 3 days after due date
            if self.current_period_end:
                grace = self.current_period_end + timezone.timedelta(days=3)
                return timezone.now() < grace
        return False

    @property
    def days_remaining(self) -> int:
        """Days left in current period (trial or billing cycle)."""
        end = self.trial_end if self.status == self.Status.TRIALING else self.current_period_end
        if end:
            delta = end - timezone.now()
            return max(0, delta.days)
        return 0

    @property
    def is_trial(self) -> bool:
        return self.status == self.Status.TRIALING

    @property
    def is_cancelled(self) -> bool:
        return self.status in (self.Status.CANCELLED, self.Status.EXPIRED)


# ─────────────────────────────────────────────────────────────────────────────
# Invoice
# ─────────────────────────────────────────────────────────────────────────────

class Invoice(models.Model):
    """
    Payment history record. Created from Stripe webhooks.
    """

    class Status(models.TextChoices):
        DRAFT   = 'draft',   'Draft'
        OPEN    = 'open',    'Open'
        PAID    = 'paid',    'Paid'
        VOID    = 'void',    'Void'
        UNCOLLECTIBLE = 'uncollectible', 'Uncollectible'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='invoices'
    )

    stripe_invoice_id = models.CharField(max_length=100, unique=True, blank=True)
    amount            = models.DecimalField(max_digits=10, decimal_places=2)
    currency          = models.CharField(max_length=3, default='EGP')
    status            = models.CharField(max_length=20, choices=Status.choices)
    period_start      = models.DateTimeField()
    period_end        = models.DateTimeField()
    paid_at           = models.DateTimeField(null=True, blank=True)
    hosted_invoice_url = models.URLField(blank=True)
    invoice_pdf        = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invoice {self.stripe_invoice_id or self.id} — {self.amount} {self.currency}"


# ─────────────────────────────────────────────────────────────────────────────
# Usage tracking (for limits enforcement)
# ─────────────────────────────────────────────────────────────────────────────

class UsageRecord(models.Model):
    """
    Monthly snapshot of usage per subscription.
    Reset on the 1st of each month by Celery Beat.
    """

    subscription        = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='usage')
    month               = models.DateField(help_text="First day of the billing month")
    appointments_count  = models.PositiveIntegerField(default=0)
    clinics_count       = models.PositiveIntegerField(default=0)
    doctors_count       = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('subscription', 'month')
        ordering = ['-month']

    def __str__(self):
        return f"Usage {self.subscription.owner.username} — {self.month}"
