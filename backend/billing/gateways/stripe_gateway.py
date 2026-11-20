"""CuraBook — Stripe Gateway (للأسواق الدولية)"""
import logging
from django.conf import settings

logger = logging.getLogger('curabook.billing.stripe')


class StripeGateway:
    """Stripe — يُستخدم للمدفوعات الدولية."""

    def create_checkout_session(self, subscription, user, method='card', currency='USD'):
        try:
            import stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
        except ImportError:
            raise RuntimeError('stripe package not installed')

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3080')
        session = stripe.checkout.Session.create(
            customer_email=user.email,
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency.lower(),
                    'product_data': {'name': f'CuraBook {subscription.plan.name}'},
                    'unit_amount': int(subscription.plan.price_monthly * 100),
                    'recurring': {'interval': 'month'},
                },
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f'{frontend_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=f'{frontend_url}/billing?cancelled=1',
            metadata={'subscription_id': str(subscription.id), 'user_id': str(user.id)},
        )
        return {
            'redirect_url': session.url,
            'order_id':     session.id,
            'payment_key':  session.id,
            'method':       'card',
        }

    def verify_webhook(self, data): return True
    def handle_webhook(self, data): return {'status': 'ok'}
