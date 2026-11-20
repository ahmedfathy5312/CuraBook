"""CuraBook — Mock Payment Gateway (للـ development فقط)"""
import logging
from django.conf import settings

logger = logging.getLogger('curabook.billing.mock')


class MockGateway:
    """يُستخدم في dev/test — لا يتصل بأي بوابة دفع حقيقية."""

    def create_checkout_session(self, subscription, user, method='card', currency='EGP'):
        logger.info('[MockGateway] Fake checkout session for user=%s plan=%s', user.id, subscription.plan.name)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3080')
        return {
            'redirect_url': f'{frontend_url}/billing/success?mock=1&plan={subscription.plan.tier}',
            'order_id':     'MOCK-ORDER-001',
            'payment_key':  'MOCK-KEY',
            'method':       method,
        }

    def verify_webhook(self, data): return True
    def handle_webhook(self, data): return {'status': 'ok', 'success': True}
