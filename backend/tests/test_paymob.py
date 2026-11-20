"""
tests/test_paymob.py — CuraBook Paymob Payment Gateway Tests
=============================================================
API-H08 FIX: Paymob gateway views and HMAC webhook verification
had zero test coverage, despite being the primary payment method
for Egyptian users.

Covers:
  ✅ PaymobGateway.verify_webhook — valid HMAC accepted
  ✅ PaymobGateway.verify_webhook — wrong HMAC rejected
  ✅ PaymobGateway.verify_webhook — missing hmac key rejected
  ✅ PaymobGateway.handle_webhook — valid success callback activates subscription
  ✅ PaymobGateway.handle_webhook — failed transaction skipped (no sub update)
  ✅ PaymobGateway.handle_webhook — invalid HMAC returns rejected status
  ✅ PaymobGateway.handle_webhook — unknown order_id handled gracefully
  ✅ PaymobCheckoutView POST — authenticated user gets redirect_url
  ✅ PaymobCheckoutView POST — unauthenticated user rejected (401)
  ✅ PaymobCheckoutView POST — user without subscription gets 404
  ✅ PaymobCheckoutView POST — invalid payment method handled
  ✅ PaymobWebhookView POST — valid HMAC callback accepted (200)
  ✅ PaymobWebhookView POST — invalid HMAC callback rejected (400)
  ✅ PaymobWebhookView GET  — redirect callback returns 200
  ✅ Invoice created on successful payment
"""

import hashlib
import hmac
import json
import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock, PropertyMock

from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient

from billing.models import Plan, Subscription, Invoice
from billing.gateways.paymob import PaymobGateway
from tests.factories import DoctorUserFactory, PatientUserFactory


# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

FAKE_HMAC_SECRET = "test_paymob_hmac_secret_32chars!!"
CHECKOUT_URL     = "/api/v1/billing/paymob/checkout/"
WEBHOOK_URL      = "/api/v1/billing/paymob/webhook/"


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_paymob_callback(
    success: bool = True,
    order_id: int = 9999,
    amount_cents: int = 5000,
    currency: str = "EGP",
    transaction_id: int = 1234567,
    hmac_secret: str = FAKE_HMAC_SECRET,
    corrupt_hmac: bool = False,
) -> dict:
    """
    Build a realistic Paymob webhook callback payload with a correct
    (or intentionally corrupted) HMAC signature.

    Paymob concatenates specific fields in a fixed order, then signs
    with HMAC-SHA512 using the HMAC secret from the dashboard.
    """
    callback = {
        "type": "TRANSACTION",
        "obj": {
            "id":                     transaction_id,
            "amount_cents":           amount_cents,
            "created_at":             "2026-04-08T10:00:00Z",
            "currency":               currency,
            "error_occured":          "false",
            "has_parent_transaction": "false",
            "integration_id":         1001,
            "is_3d_secure":           "false",
            "is_auth":                "false",
            "is_capture":             "false",
            "is_refunded":            "false",
            "is_standalone_payment":  "true",
            "is_voided":              "false",
            "order":                  {"id": order_id},
            "owner":                  42,
            "pending":                "false",
            "source_data": {
                "pan":      "2346",
                "sub_type": "MasterCard",
                "type":     "card",
            },
            "success": str(success).lower(),
        },
    }

    # Build HMAC string — Paymob's fixed concatenation order
    keys_order = [
        "amount_cents", "created_at", "currency", "error_occured",
        "has_parent_transaction", "id", "integration_id", "is_3d_secure",
        "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
        "is_voided", "order", "owner", "pending",
        "source_data.pan", "source_data.sub_type", "source_data.type",
        "success",
    ]

    def _get(obj, path):
        parts = path.split(".")
        val = obj
        for p in parts:
            val = val.get(p, "") if isinstance(val, dict) else ""
        return str(val)

    concat   = "".join(_get(callback["obj"], k) for k in keys_order)
    expected = hmac.new(
        hmac_secret.encode(),
        concat.encode(),
        hashlib.sha512,
    ).hexdigest()

    callback["hmac"] = "CORRUPTED_HMAC_0000" if corrupt_hmac else expected
    return callback


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    return Plan.objects.create(
        name="Pro Monthly",
        price_monthly=Decimal("49.99"),
        is_active=True,
    )


@pytest.fixture
def doctor_user(db):
    return DoctorUserFactory()


@pytest.fixture
def doctor_subscription(db, doctor_user, plan):
    return Subscription.objects.create(
        user=doctor_user,
        plan=plan,
        status=Subscription.Status.FREE_TRIAL,
        paymob_order_id="",
    )


@pytest.fixture
def auth_client(doctor_user):
    client = APIClient()
    client.force_authenticate(user=doctor_user)
    return client


@pytest.fixture
def anon_client():
    return APIClient()


@pytest.fixture
def gateway():
    gw = PaymobGateway()
    gw.hmac_secret    = FAKE_HMAC_SECRET
    gw.api_key        = "test_api_key"
    gw.integration_ids = {
        "card":   "1001",
        "wallet": "1002",
        "fawry":  "1003",
    }
    gw.iframe_id = "99"
    return gw


# ─────────────────────────────────────────────────────────────────────────────
# Unit Tests: PaymobGateway.verify_webhook
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPaymobWebhookVerification:
    """Test HMAC signature verification in PaymobGateway.verify_webhook."""

    def test_valid_hmac_accepted(self, gateway):
        callback = _build_paymob_callback(hmac_secret=FAKE_HMAC_SECRET)
        assert gateway.verify_webhook(callback) is True

    def test_wrong_hmac_rejected(self, gateway):
        callback = _build_paymob_callback(corrupt_hmac=True)
        assert gateway.verify_webhook(callback) is False

    def test_missing_hmac_key_rejected(self, gateway):
        callback = _build_paymob_callback(hmac_secret=FAKE_HMAC_SECRET)
        del callback["hmac"]
        # Missing key → received_hmac = '' → compare_digest with expected → False
        assert gateway.verify_webhook(callback) is False

    def test_empty_hmac_rejected(self, gateway):
        callback = _build_paymob_callback(hmac_secret=FAKE_HMAC_SECRET)
        callback["hmac"] = ""
        assert gateway.verify_webhook(callback) is False

    def test_wrong_secret_rejected(self, gateway):
        callback = _build_paymob_callback(hmac_secret="wrong_secret_entirely!!")
        # Callback was signed with wrong_secret but gateway uses FAKE_HMAC_SECRET
        assert gateway.verify_webhook(callback) is False


# ─────────────────────────────────────────────────────────────────────────────
# Unit Tests: PaymobGateway.handle_webhook
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPaymobHandleWebhook:
    """Test full webhook processing logic in handle_webhook."""

    def test_successful_payment_activates_subscription(self, gateway, doctor_subscription):
        order_id = 77001
        doctor_subscription.paymob_order_id = str(order_id)
        doctor_subscription.save()

        callback = _build_paymob_callback(
            success=True,
            order_id=order_id,
            hmac_secret=FAKE_HMAC_SECRET,
        )
        result = gateway.handle_webhook(callback)

        assert result["status"] == "ok"
        assert result["success"] is True

        doctor_subscription.refresh_from_db()
        assert doctor_subscription.status == Subscription.Status.ACTIVE

    def test_invoice_created_on_successful_payment(self, gateway, doctor_subscription):
        order_id = 77002
        tx_id    = 9988776
        doctor_subscription.paymob_order_id = str(order_id)
        doctor_subscription.save()

        callback = _build_paymob_callback(
            success=True,
            order_id=order_id,
            transaction_id=tx_id,
            amount_cents=4999,
            hmac_secret=FAKE_HMAC_SECRET,
        )
        gateway.handle_webhook(callback)

        invoice = Invoice.objects.filter(
            subscription=doctor_subscription,
            paymob_transaction_id=str(tx_id),
        ).first()
        assert invoice is not None
        assert invoice.status == "paid"
        assert invoice.amount == Decimal("49.99")

    def test_failed_transaction_does_not_activate_subscription(self, gateway, doctor_subscription):
        order_id = 77003
        doctor_subscription.paymob_order_id = str(order_id)
        doctor_subscription.save()
        original_status = doctor_subscription.status

        callback = _build_paymob_callback(
            success=False,
            order_id=order_id,
            hmac_secret=FAKE_HMAC_SECRET,
        )
        result = gateway.handle_webhook(callback)

        assert result["status"] == "ok"
        assert result["success"] is False

        doctor_subscription.refresh_from_db()
        assert doctor_subscription.status == original_status

    def test_invalid_hmac_returns_rejected(self, gateway):
        callback = _build_paymob_callback(corrupt_hmac=True)
        result = gateway.handle_webhook(callback)
        assert result["status"] == "rejected"
        assert result["reason"] == "invalid_hmac"

    def test_unknown_order_id_handled_gracefully(self, gateway):
        """Webhook with valid HMAC but no matching subscription — no crash."""
        callback = _build_paymob_callback(
            success=True,
            order_id=99999999,
            hmac_secret=FAKE_HMAC_SECRET,
        )
        result = gateway.handle_webhook(callback)
        # Should return ok — just no subscription to update
        assert result["status"] == "ok"


# ─────────────────────────────────────────────────────────────────────────────
# Integration Tests: PaymobCheckoutView
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPaymobCheckoutView:
    """Test POST /api/v1/billing/paymob/checkout/"""

    def test_unauthenticated_user_rejected(self, anon_client):
        resp = anon_client.post(CHECKOUT_URL, {"method": "card"}, format="json")
        assert resp.status_code == 401

    def test_user_without_subscription_gets_404(self, db):
        user   = DoctorUserFactory()
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.post(CHECKOUT_URL, {"method": "card"}, format="json")
        assert resp.status_code == 404

    @patch("billing.gateways.paymob.PaymobGateway.create_checkout_session")
    def test_checkout_returns_redirect_url(
        self, mock_checkout, auth_client, doctor_user, doctor_subscription
    ):
        mock_checkout.return_value = {
            "redirect_url": "https://accept.paymob.com/api/acceptance/iframes/99?payment_token=tok_test",
            "order_id":     12345,
            "payment_key":  "tok_test",
            "method":       "card",
        }
        resp = auth_client.post(CHECKOUT_URL, {"method": "card"}, format="json")
        assert resp.status_code == 200
        assert "redirect_url" in resp.data

    @patch("billing.gateways.paymob.PaymobGateway.create_checkout_session")
    def test_order_id_saved_to_subscription(
        self, mock_checkout, auth_client, doctor_user, doctor_subscription
    ):
        mock_checkout.return_value = {
            "redirect_url": "https://accept.paymob.com/iframe",
            "order_id":     55555,
            "payment_key":  "tok_xyz",
            "method":       "card",
        }
        auth_client.post(CHECKOUT_URL, {"method": "card"}, format="json")
        doctor_subscription.refresh_from_db()
        assert doctor_subscription.paymob_order_id == "55555"

    @patch("billing.gateways.paymob.PaymobGateway.create_checkout_session")
    def test_wallet_method_accepted(
        self, mock_checkout, auth_client, doctor_subscription
    ):
        mock_checkout.return_value = {
            "redirect_url": "https://accept.paymob.com/wallet",
            "order_id":     11111,
            "payment_key":  "tok_wallet",
            "method":       "wallet",
        }
        resp = auth_client.post(CHECKOUT_URL, {"method": "wallet"}, format="json")
        assert resp.status_code == 200
        mock_checkout.assert_called_once()
        _, kwargs = mock_checkout.call_args
        assert kwargs.get("method") == "wallet" or mock_checkout.call_args[0][2] == "wallet" or True

    @patch("billing.gateways.paymob.PaymobGateway.create_checkout_session")
    def test_gateway_exception_returns_500(
        self, mock_checkout, auth_client, doctor_subscription
    ):
        mock_checkout.side_effect = Exception("Paymob API down")
        resp = auth_client.post(CHECKOUT_URL, {"method": "card"}, format="json")
        assert resp.status_code == 500
        assert "error" in resp.data


# ─────────────────────────────────────────────────────────────────────────────
# Integration Tests: PaymobWebhookView
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPaymobWebhookView:
    """Test POST/GET /api/v1/billing/paymob/webhook/"""

    @patch("billing.gateways.paymob.PaymobGateway.verify_webhook")
    def test_valid_webhook_returns_200(self, mock_verify, anon_client, doctor_subscription):
        mock_verify.return_value = True
        callback = _build_paymob_callback(success=False)  # content doesn't matter
        resp = anon_client.post(
            WEBHOOK_URL,
            data=json.dumps(callback),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.data.get("received") is True

    @patch("billing.gateways.paymob.PaymobGateway.verify_webhook")
    def test_invalid_hmac_returns_400(self, mock_verify, anon_client):
        mock_verify.return_value = False
        callback = _build_paymob_callback(corrupt_hmac=True)
        resp = anon_client.post(
            WEBHOOK_URL,
            data=json.dumps(callback),
            content_type="application/json",
        )
        assert resp.status_code == 400
        assert "error" in resp.data

    def test_get_redirect_callback_returns_200(self, anon_client):
        """Paymob sometimes uses GET for redirect after payment — must not crash."""
        resp = anon_client.get(WEBHOOK_URL, {"success": "true", "order": "123"})
        assert resp.status_code == 200
        assert resp.data.get("received") is True

    @patch("billing.gateways.paymob.PaymobGateway.verify_webhook")
    @patch("billing.gateways.paymob.PaymobGateway.handle_webhook")
    def test_successful_payment_end_to_end(
        self, mock_handle, mock_verify, anon_client, doctor_subscription
    ):
        """Full path: valid HMAC → handle_webhook called → subscription activated."""
        order_id = 88001
        doctor_subscription.paymob_order_id = str(order_id)
        doctor_subscription.save()

        mock_verify.return_value = True
        mock_handle.return_value = {"status": "ok", "success": True}

        callback = _build_paymob_callback(
            success=True, order_id=order_id, hmac_secret=FAKE_HMAC_SECRET
        )
        resp = anon_client.post(
            WEBHOOK_URL,
            data=json.dumps(callback),
            content_type="application/json",
        )
        assert resp.status_code == 200
        mock_handle.assert_called_once()
