"""
CuraBook — Paymob Payment Gateway
===================================
Paymob هو أشهر بوابة دفع إلكتروني في مصر.
يدعم: بطاقات Visa/MC، محافظ Vodafone Cash، Fawry، InstaPay، Meeza

Env vars required:
    PAYMOB_API_KEY          — مفتاح API من dashboard.paymob.com
    PAYMOB_INTEGRATION_ID   — integration ID للبطاقات
    PAYMOB_WALLET_INTEGRATION_ID  — integration ID للمحافظ (Vodafone Cash)
    PAYMOB_FAWRY_INTEGRATION_ID   — integration ID لـ Fawry
    PAYMOB_IFRAME_ID        — iframe ID للبطاقات
    PAYMOB_HMAC_SECRET      — لـ webhook verification

Usage:
    from billing.gateways.paymob import PaymobGateway
    gw = PaymobGateway()
    result = gw.create_checkout_session(subscription, user, method='card')
    # result['redirect_url'] → وجّه المستخدم عليه
"""

import hashlib
import hmac
import logging
import requests

from django.conf import settings

logger = logging.getLogger('curabook.billing.paymob')

PAYMOB_BASE = 'https://accept.paymob.com/api'


class PaymobGateway:
    """
    بوابة Paymob — المدفوعات المصرية.
    تدعم card، wallet (Vodafone Cash)، fawry.
    """

    def __init__(self):
        self.api_key = getattr(settings, 'PAYMOB_API_KEY', '')
        self.integration_ids = {
            'card':   getattr(settings, 'PAYMOB_INTEGRATION_ID', ''),
            'wallet': getattr(settings, 'PAYMOB_WALLET_INTEGRATION_ID', ''),
            'fawry':  getattr(settings, 'PAYMOB_FAWRY_INTEGRATION_ID', ''),
        }
        self.iframe_id  = getattr(settings, 'PAYMOB_IFRAME_ID', '')
        self.hmac_secret = getattr(settings, 'PAYMOB_HMAC_SECRET', '')

    # ── Step 1: Auth token ────────────────────────────────────────────────────

    def _get_auth_token(self) -> str:
        resp = requests.post(
            f'{PAYMOB_BASE}/auth/tokens',
            json={'api_key': self.api_key},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()['token']

    # ── Step 2: Create order ──────────────────────────────────────────────────

    def _create_order(self, auth_token: str, amount_cents: int, currency: str = 'EGP') -> dict:
        resp = requests.post(
            f'{PAYMOB_BASE}/ecommerce/orders',
            json={
                'auth_token':      auth_token,
                'delivery_needed': False,
                'amount_cents':    amount_cents,
                'currency':        currency,
                'items':           [],
            },
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()

    # ── Step 3: Payment key ───────────────────────────────────────────────────

    def _get_payment_key(
        self,
        auth_token: str,
        order_id: int,
        amount_cents: int,
        user,
        integration_id: str,
        currency: str = 'EGP',
    ) -> str:
        billing_data = {
            'apartment':    'NA',
            'email':        user.email,
            'floor':        'NA',
            'first_name':   (user.full_name or user.username).split()[0],
            'street':       'NA',
            'building':     'NA',
            'phone_number': user.phone or '+20000000000',
            'shipping_method': 'NA',
            'postal_code':  'NA',
            'city':         user.city or 'Cairo',
            'country':      'EG',
            'last_name':    (user.full_name or user.username).split()[-1],
            'state':        'NA',
        }
        resp = requests.post(
            f'{PAYMOB_BASE}/acceptance/payment_keys',
            json={
                'auth_token':     auth_token,
                'amount_cents':   amount_cents,
                'expiration':     3600,
                'order_id':       order_id,
                'billing_data':   billing_data,
                'currency':       currency,
                'integration_id': int(integration_id),
            },
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()['token']

    # ── Public API ────────────────────────────────────────────────────────────

    def create_checkout_session(
        self,
        subscription,
        user,
        method: str = 'card',
        currency: str = 'EGP',
    ) -> dict:
        """
        ينشئ جلسة دفع Paymob ويرجع redirect_url.

        method: 'card' | 'wallet' | 'fawry'
        Returns:
            {
                'redirect_url': str,   # وجّه المستخدم عليه
                'order_id': int,
                'payment_key': str,
                'method': str,
            }
        """
        integration_id = self.integration_ids.get(method)
        if not integration_id:
            raise ValueError(f'Unsupported payment method: {method}')

        # Amount in cents (Paymob uses piastres/cents)
        amount_cents = int(subscription.plan.price_monthly * 100)

        auth_token = self._get_auth_token()
        order = self._create_order(auth_token, amount_cents, currency)
        payment_key = self._get_payment_key(
            auth_token, order['id'], amount_cents, user, integration_id, currency
        )

        if method == 'card':
            redirect_url = f'https://accept.paymob.com/api/acceptance/iframes/{self.iframe_id}?payment_token={payment_key}'
        elif method == 'wallet':
            # Vodafone Cash / Orange Money / Etisalat
            redirect_url = f'https://accept.paymob.com/api/acceptance/payments/pay?payment_token={payment_key}'
        else:
            # Fawry — generates a reference code
            redirect_url = f'https://accept.paymob.com/api/acceptance/payments/pay?payment_token={payment_key}'

        logger.info(
            '[Paymob] checkout session created: order=%s method=%s amount=%s EGP user=%s',
            order['id'], method, subscription.plan.price_monthly, user.id,
        )

        return {
            'redirect_url': redirect_url,
            'order_id':     order['id'],
            'payment_key':  payment_key,
            'method':       method,
        }

    # ── Webhook verification ──────────────────────────────────────────────────

    def verify_webhook(self, callback_data: dict) -> bool:
        """
        يتحقق من صحة webhook من Paymob باستخدام HMAC-SHA512.
        لازم تستدعيه في الـ webhook view قبل أي processing.
        """
        received_hmac = callback_data.get('hmac', '')
        keys_order = [
            'amount_cents', 'created_at', 'currency', 'error_occured',
            'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure',
            'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment',
            'is_voided', 'order', 'owner', 'pending', 'source_data.pan',
            'source_data.sub_type', 'source_data.type', 'success',
        ]

        def _get(obj, path):
            parts = path.split('.')
            val = obj
            for p in parts:
                if isinstance(val, dict):
                    val = val.get(p, '')
                else:
                    val = ''
            return str(val)

        concat = ''.join(_get(callback_data, k) for k in keys_order)
        expected = hmac.new(
            self.hmac_secret.encode(),
            concat.encode(),
            hashlib.sha512,
        ).hexdigest()

        return hmac.compare_digest(received_hmac, expected)

    def handle_webhook(self, callback_data: dict) -> dict:
        """
        يعالج webhook من Paymob ويحدّث الـ subscription.
        """
        if not self.verify_webhook(callback_data):
            logger.warning('[Paymob] webhook HMAC verification failed')
            return {'status': 'rejected', 'reason': 'invalid_hmac'}

        transaction = callback_data.get('obj', {})
        success     = transaction.get('success', False)
        order_id    = str(transaction.get('order', {}).get('id', ''))

        if success:
            from billing.models import Subscription, Invoice
            from django.utils import timezone
            from datetime import timedelta
            from decimal import Decimal

            # تحديث الـ subscription إن وجد بـ order_id مخزّن
            sub = Subscription.objects.filter(
                paymob_order_id=order_id
            ).first()
            if sub:
                sub.status = Subscription.Status.ACTIVE
                sub.paymob_order_id = order_id
                sub.current_period_start = timezone.now()
                sub.current_period_end   = timezone.now() + timedelta(days=30)
                sub.save()

                Invoice.objects.get_or_create(
                    subscription=sub,
                    paymob_transaction_id=str(transaction.get('id', '')),
                    defaults={
                        'amount':   Decimal(transaction.get('amount_cents', 0)) / 100,
                        'currency': transaction.get('currency', 'EGP'),
                        'status':   'paid',
                        'paid_at':  timezone.now(),
                    },
                )
                logger.info('[Paymob] subscription activated: sub=%s order=%s', sub.id, order_id)

        return {'status': 'ok', 'success': success}


# ── Factory ────────────────────────────────────────────────────────────────────

def get_payment_gateway(provider: str = None):
    """
    Factory — يرجع الـ gateway المناسب حسب BILLING_PROVIDER.
    provider: 'stripe' | 'paymob' | 'mock'
    """
    from django.conf import settings
    provider = provider or getattr(settings, 'BILLING_PROVIDER', 'mock')

    if provider == 'paymob':
        return PaymobGateway()
    elif provider == 'stripe':
        from billing.gateways.stripe_gateway import StripeGateway
        return StripeGateway()
    else:
        from billing.gateways.mock_gateway import MockGateway
        return MockGateway()
