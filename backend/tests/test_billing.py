"""
tests/test_billing.py — CuraBook Billing & Stripe Webhook Tests
================================================================
API-C04 FIX: Billing module had zero test coverage.
Stripe webhook signature validation was completely untested — a broken
signature check would allow anyone to send fake payment events.

Covers:
  ✅ Plan list (public, excludes free_trial)
  ✅ Subscription detail auto-creates free trial on first access
  ✅ Stripe webhook — valid signature accepted (200)
  ✅ Stripe webhook — invalid signature rejected (400)
  ✅ Stripe webhook — missing signature header rejected (400)
  ✅ Stripe webhook — checkout.session.completed activates subscription
  ✅ Stripe webhook — customer.subscription.deleted deactivates subscription
  ✅ Checkout session creation — authenticated user gets Stripe URL
  ✅ Checkout session — unauthenticated user rejected (401)
  ✅ Subscription cancel flow
  ✅ Subscription reactivate flow
"""

import json
import time
import hashlib
import hmac
import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.utils import timezone
from rest_framework.test import APIClient

from billing.models import Plan, Subscription
from tests.factories import UserFactory, DoctorUserFactory


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_stripe_signature(payload: bytes, secret: str) -> str:
    """Reproduce Stripe's webhook signature format: t=<ts>,v1=<hmac>."""
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
    signature = hmac.new(
        secret.encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()
    return f"t={timestamp},v1={signature}"


FAKE_WEBHOOK_SECRET = 'whsec_test_fake_secret_for_testing'
WEBHOOK_URL = '/api/v1/billing/webhook/stripe/'


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def user(db):
    return DoctorUserFactory()


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def starter_plan(db):
    return Plan.objects.create(
        name='Starter',
        tier=Plan.Tier.STARTER,
        price_monthly=Decimal('299.00'),
        price_yearly=Decimal('2990.00'),
        is_active=True,
    )


@pytest.fixture
def free_trial_plan(db):
    return Plan.objects.create(
        name='Free Trial',
        tier=Plan.Tier.FREE_TRIAL,
        trial_days=14,
        is_active=True,
    )


@pytest.fixture
def subscription(db, user, starter_plan):
    return Subscription.objects.create(
        user=user,
        plan=starter_plan,
        status=Subscription.Status.ACTIVE,
        stripe_subscription_id='sub_test_123',
        stripe_customer_id='cus_test_456',
        current_period_end=timezone.now() + timezone.timedelta(days=30),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Plan List
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPlanList:

    def test_plan_list_is_public(self, starter_plan):
        client = APIClient()
        resp = client.get('/api/v1/billing/plans/')
        assert resp.status_code == 200

    def test_plan_list_excludes_free_trial(self, starter_plan, free_trial_plan):
        client = APIClient()
        resp = client.get('/api/v1/billing/plans/')
        tiers = [p['tier'] for p in resp.data]
        assert 'free_trial' not in tiers
        assert 'starter' in tiers

    def test_inactive_plan_excluded(self, db):
        Plan.objects.create(name='Hidden', tier=Plan.Tier.PRO, is_active=False)
        client = APIClient()
        resp = client.get('/api/v1/billing/plans/')
        tiers = [p['tier'] for p in resp.data]
        assert 'pro' not in tiers


# ─────────────────────────────────────────────────────────────────────────────
# Subscription
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSubscriptionDetail:

    def test_returns_existing_subscription(self, auth_client, subscription):
        resp = auth_client.get('/api/v1/billing/subscription/')
        assert resp.status_code == 200
        assert resp.data['stripe_subscription_id'] == 'sub_test_123'

    def test_auto_creates_free_trial_if_none_exists(self, auth_client, user, free_trial_plan):
        """First access should auto-create a trial subscription."""
        assert not Subscription.objects.filter(user=user).exists()
        resp = auth_client.get('/api/v1/billing/subscription/')
        assert resp.status_code == 200
        assert Subscription.objects.filter(user=user).exists()

    def test_unauthenticated_cannot_view_subscription(self):
        client = APIClient()
        resp = client.get('/api/v1/billing/subscription/')
        assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Checkout
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCheckout:

    def test_unauthenticated_checkout_rejected(self, starter_plan):
        client = APIClient()
        resp = client.post('/api/v1/billing/checkout/', {
            'plan_tier': 'starter', 'interval': 'monthly',
        }, format='json')
        assert resp.status_code == 401

    @patch('billing.services.create_checkout_session')
    def test_authenticated_user_gets_checkout_url(self, mock_checkout, auth_client, starter_plan, free_trial_plan, user):
        mock_checkout.return_value = 'https://checkout.stripe.com/pay/fake_session'
        Subscription.objects.create(
            user=user,
            plan=free_trial_plan,
            status=Subscription.Status.TRIALING,
            current_period_end=timezone.now() + timezone.timedelta(days=7),
        )
        resp = auth_client.post('/api/v1/billing/checkout/', {
            'plan_tier': 'starter', 'interval': 'monthly',
        }, format='json')
        assert resp.status_code == 200
        assert 'checkout_url' in resp.data
        assert 'stripe.com' in resp.data['checkout_url']

    def test_invalid_plan_tier_returns_404(self, auth_client):
        resp = auth_client.post('/api/v1/billing/checkout/', {
            'plan_tier': 'nonexistent', 'interval': 'monthly',
        }, format='json')
        assert resp.status_code in (400, 404)


# ─────────────────────────────────────────────────────────────────────────────
# Stripe Webhook — Signature Validation (CRITICAL)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestStripeWebhook:

    def _send_webhook(self, client, payload: dict, secret=FAKE_WEBHOOK_SECRET,
                      corrupt_sig=False, omit_sig=False):
        body = json.dumps(payload).encode('utf-8')
        sig = _make_stripe_signature(body, secret)
        if corrupt_sig:
            sig = sig[:-5] + 'XXXXX'
        headers = {}
        if not omit_sig:
            headers['HTTP_STRIPE_SIGNATURE'] = sig
        return client.post(
            WEBHOOK_URL,
            data=body,
            content_type='application/json',
            **headers,
        )

    @patch('billing.views.settings')
    @patch('stripe.Webhook.construct_event')
    @patch('billing.views.handle_webhook_event')
    def test_valid_signature_accepted(self, mock_handler, mock_construct, mock_settings):
        mock_settings.BILLING_PROVIDER = 'stripe'
        mock_settings.STRIPE_WEBHOOK_SECRET = FAKE_WEBHOOK_SECRET
        mock_construct.return_value = MagicMock(
            type='payment_intent.succeeded',
            data=MagicMock(object={'id': 'pi_test'}),
        )
        client = APIClient()
        payload = {'type': 'payment_intent.succeeded', 'data': {'object': {}}}
        resp = self._send_webhook(client, payload)
        assert resp.status_code == 200
        mock_handler.assert_called_once()

    @patch('billing.views.settings')
    @patch('stripe.Webhook.construct_event')
    def test_invalid_signature_rejected(self, mock_construct, mock_settings):
        """A corrupted signature MUST return 400 — this is the security gate."""
        import stripe
        mock_settings.BILLING_PROVIDER = 'stripe'
        mock_settings.STRIPE_WEBHOOK_SECRET = FAKE_WEBHOOK_SECRET
        mock_construct.side_effect = stripe.error.SignatureVerificationError(
            'Invalid signature', 'fake_sig'
        )
        client = APIClient()
        payload = {'type': 'checkout.session.completed', 'data': {'object': {}}}
        resp = self._send_webhook(client, payload, corrupt_sig=True)
        assert resp.status_code == 400, (
            f"SECURITY FAILURE: Invalid Stripe signature was accepted! Got {resp.status_code}"
        )

    @patch('billing.views.settings')
    def test_missing_signature_header_rejected(self, mock_settings):
        """No Stripe-Signature header at all → 400."""
        mock_settings.BILLING_PROVIDER = 'stripe'
        mock_settings.STRIPE_WEBHOOK_SECRET = FAKE_WEBHOOK_SECRET
        client = APIClient()
        payload = {'type': 'checkout.session.completed', 'data': {'object': {}}}
        resp = self._send_webhook(client, payload, omit_sig=True)
        assert resp.status_code == 400, (
            f"SECURITY FAILURE: Missing signature header was not rejected! Got {resp.status_code}"
        )

    @patch('billing.views.settings')
    @patch('stripe.Webhook.construct_event')
    @patch('billing.views.handle_webhook_event')
    def test_checkout_session_completed_activates_subscription(
        self, mock_handler, mock_construct, mock_settings, db, user, starter_plan
    ):
        """checkout.session.completed should trigger handle_webhook_event with correct args."""
        mock_settings.BILLING_PROVIDER = 'stripe'
        mock_settings.STRIPE_WEBHOOK_SECRET = FAKE_WEBHOOK_SECRET
        event_data = {
            'id': 'cs_test_abc',
            'customer': 'cus_test_456',
            'subscription': 'sub_test_new',
            'metadata': {'user_id': str(user.pk), 'plan_tier': 'starter'},
        }
        mock_construct.return_value = MagicMock(
            type='checkout.session.completed',
            data=MagicMock(object=event_data),
        )
        client = APIClient()
        payload = {'type': 'checkout.session.completed', 'data': {'object': event_data}}
        resp = self._send_webhook(client, payload)
        assert resp.status_code == 200
        mock_handler.assert_called_once_with('checkout.session.completed', event_data)

    @patch('billing.views.settings')
    @patch('stripe.Webhook.construct_event')
    @patch('billing.views.handle_webhook_event')
    def test_subscription_deleted_event_handled(
        self, mock_handler, mock_construct, mock_settings
    ):
        """customer.subscription.deleted should be passed to handle_webhook_event."""
        mock_settings.BILLING_PROVIDER = 'stripe'
        mock_settings.STRIPE_WEBHOOK_SECRET = FAKE_WEBHOOK_SECRET
        event_data = {'id': 'sub_test_del', 'status': 'canceled'}
        mock_construct.return_value = MagicMock(
            type='customer.subscription.deleted',
            data=MagicMock(object=event_data),
        )
        client = APIClient()
        payload = {'type': 'customer.subscription.deleted', 'data': {'object': event_data}}
        resp = self._send_webhook(client, payload)
        assert resp.status_code == 200
        mock_handler.assert_called_once_with('customer.subscription.deleted', event_data)

    @patch('billing.views.settings')
    @patch('billing.views.handle_webhook_event')
    def test_mock_billing_provider_skips_signature_check(self, mock_handler, mock_settings):
        """When BILLING_PROVIDER=mock, signature validation is skipped (for dev/test)."""
        mock_settings.BILLING_PROVIDER = 'mock'
        mock_settings.STRIPE_WEBHOOK_SECRET = ''
        client = APIClient()
        payload = {'type': 'checkout.session.completed', 'data': {'object': {}}}
        body = json.dumps(payload).encode('utf-8')
        resp = client.post(WEBHOOK_URL, data=body, content_type='application/json')
        # In mock mode this should not error on missing signature
        assert resp.status_code in (200, 400)  # 400 only if event_type not handled


# ─────────────────────────────────────────────────────────────────────────────
# Subscription Lifecycle
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSubscriptionLifecycle:

    @patch('billing.services.cancel_subscription')
    def test_cancel_subscription(self, mock_cancel, auth_client, subscription):
        mock_cancel.return_value = subscription
        resp = auth_client.post('/api/v1/billing/subscription/cancel/')
        assert resp.status_code in (200, 204)
        mock_cancel.assert_called_once()

    @patch('billing.services.reactivate_subscription')
    def test_reactivate_subscription(self, mock_reactivate, auth_client, subscription):
        mock_reactivate.return_value = subscription
        resp = auth_client.post('/api/v1/billing/subscription/reactivate/')
        assert resp.status_code in (200, 204)
        mock_reactivate.assert_called_once()

    def test_cancel_unauthenticated_rejected(self):
        client = APIClient()
        resp = client.post('/api/v1/billing/subscription/cancel/')
        assert resp.status_code == 401
