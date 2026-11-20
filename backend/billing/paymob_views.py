"""
CuraBook — Paymob Webhook Views
GET  /api/v1/billing/paymob/checkout/    → إنشاء جلسة دفع
POST /api/v1/billing/paymob/webhook/     → استقبال callbacks من Paymob
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status

from billing.gateways.paymob import PaymobGateway
from billing.models import Subscription

logger = logging.getLogger('curabook.billing.paymob')


class PaymobCheckoutView(APIView):
    """POST /api/v1/billing/paymob/checkout/ — ينشئ رابط الدفع."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        method = request.data.get('method', 'card')  # card | wallet | fawry
        plan_id = request.data.get('plan_id')

        try:
            sub = request.user.subscription
        except Subscription.DoesNotExist:
            return Response({'error': 'No subscription found.'}, status=404)

        if plan_id:
            from billing.models import Plan
            try:
                plan = Plan.objects.get(id=plan_id, is_active=True)
                sub.plan = plan
                sub.save(update_fields=['plan'])
            except Plan.DoesNotExist:
                return Response({'error': 'Plan not found.'}, status=404)

        gw = PaymobGateway()
        try:
            result = gw.create_checkout_session(sub, request.user, method=method)
        except Exception as exc:
            logger.error('[Paymob] checkout error: %s', exc)
            return Response({'error': str(exc)}, status=500)

        # Save order_id for webhook matching
        sub.paymob_order_id = str(result['order_id'])
        sub.save(update_fields=['paymob_order_id'])

        return Response(result)


class PaymobWebhookView(APIView):
    """POST /api/v1/billing/paymob/webhook/ — callback من Paymob."""
    permission_classes = [AllowAny]

    def post(self, request):
        gw = PaymobGateway()
        result = gw.handle_webhook(request.data)
        if result.get('status') == 'rejected':
            return Response({'error': 'Invalid HMAC'}, status=400)
        return Response({'received': True})

    def get(self, request):
        """Paymob بيستخدم GET callback أحياناً للـ redirect."""
        logger.info('[Paymob] GET callback received: %s', request.GET)
        return Response({'received': True})
