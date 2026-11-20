"""
CuraBook — Billing Views
=========================
All endpoints under /api/v1/billing/
"""

import logging

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Plan, Subscription
from .serializers import (
    CancelSerializer,
    CheckoutSerializer,
    PlanSerializer,
    SubscriptionSerializer,
)
from .services import (
    cancel_subscription,
    create_checkout_session,
    create_free_trial,
    handle_webhook_event,
    reactivate_subscription,
    upgrade_plan,
)

logger = logging.getLogger('curabook.billing')


class PlanListView(APIView):
    """GET /api/v1/billing/plans/ — Public list of available plans."""
    permission_classes = [AllowAny]

    def get(self, request):
        plans = Plan.objects.filter(is_active=True).exclude(tier=Plan.Tier.FREE_TRIAL)
        return Response(PlanSerializer(plans, many=True).data)


class SubscriptionDetailView(APIView):
    """
    GET  /api/v1/billing/subscription/ — Current user's subscription
    POST /api/v1/billing/subscription/checkout/ — Start checkout
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sub = request.user.subscription
        except Subscription.DoesNotExist:
            # Auto-create trial on first access
            sub = create_free_trial(request.user)
        return Response(SubscriptionSerializer(sub).data)


class CheckoutView(APIView):
    """POST /api/v1/billing/checkout/ — Create Stripe Checkout session."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tier     = serializer.validated_data['plan_tier']
        interval = serializer.validated_data['interval']

        plan = Plan.objects.filter(tier=tier, is_active=True).first()
        if not plan:
            return Response({'detail': 'Plan not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            sub = request.user.subscription
        except Subscription.DoesNotExist:
            sub = create_free_trial(request.user)

        domain = getattr(settings, 'FRONTEND_URL', 'http://localhost:3080')
        checkout_url = create_checkout_session(
            subscription=sub,
            plan=plan,
            interval=interval,
            success_url=f'{domain}/billing/success',
            cancel_url=f'{domain}/billing',
        )
        return Response({'checkout_url': checkout_url})


class UpgradeView(APIView):
    """POST /api/v1/billing/upgrade/ — Change plan mid-cycle."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan = Plan.objects.filter(
            tier=serializer.validated_data['plan_tier'], is_active=True
        ).first()
        if not plan:
            return Response({'detail': 'Plan not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            sub = request.user.subscription
        except Subscription.DoesNotExist:
            return Response({'detail': 'No active subscription.'}, status=status.HTTP_400_BAD_REQUEST)

        redirect_url = upgrade_plan(sub, plan, serializer.validated_data['interval'])
        return Response({'checkout_url': redirect_url, 'upgraded': not redirect_url})


class CancelView(APIView):
    """POST /api/v1/billing/cancel/ — Cancel subscription."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            sub = request.user.subscription
        except Subscription.DoesNotExist:
            return Response({'detail': 'No subscription found.'}, status=status.HTTP_404_NOT_FOUND)

        updated = cancel_subscription(sub, at_period_end=serializer.validated_data['at_period_end'])
        return Response(SubscriptionSerializer(updated).data)


class ReactivateView(APIView):
    """POST /api/v1/billing/reactivate/ — Undo pending cancellation."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            sub = request.user.subscription
        except Subscription.DoesNotExist:
            return Response({'detail': 'No subscription found.'}, status=status.HTTP_404_NOT_FOUND)

        if not sub.cancel_at_period_end:
            return Response({'detail': 'Subscription is not pending cancellation.'}, status=status.HTTP_400_BAD_REQUEST)

        updated = reactivate_subscription(sub)
        return Response(SubscriptionSerializer(updated).data)


class StripeWebhookView(APIView):
    """
    POST /api/v1/billing/webhook/stripe/
    Receives Stripe webhook events.
    Signature is verified using STRIPE_WEBHOOK_SECRET.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # Stripe sends raw POST, no JWT

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')

        # Verify signature (skip in mock mode)
        billing_provider = getattr(settings, 'BILLING_PROVIDER', 'stripe')
        if billing_provider != 'mock' and webhook_secret:
            try:
                import stripe
                stripe.api_key = settings.STRIPE_SECRET_KEY
                event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
            except Exception as e:
                logger.warning('[Billing] Webhook signature invalid: %s', e)
                return Response({'detail': 'Invalid signature.'}, status=status.HTTP_400_BAD_REQUEST)
            event_type = event['type']
            event_data = event['data']
        else:
            # Mock / dev mode — accept raw JSON
            import json
            try:
                body = json.loads(payload)
                event_type = body.get('type', '')
                event_data = body.get('data', {})
            except Exception:
                return Response({'detail': 'Invalid JSON.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            handle_webhook_event(event_type, event_data)
        except Exception as e:
            logger.exception('[Billing] Webhook handler error: %s', e)
            return Response({'detail': 'Handler error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'received': True})


class BillingPortalView(APIView):
    """
    POST /api/v1/billing/portal/
    Redirects to Stripe Customer Portal for payment method management.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            sub = request.user.subscription
        except Subscription.DoesNotExist:
            return Response({'detail': 'No subscription found.'}, status=status.HTTP_404_NOT_FOUND)

        billing_provider = getattr(settings, 'BILLING_PROVIDER', 'stripe')
        if billing_provider == 'mock':
            return Response({'portal_url': f'{settings.FRONTEND_URL}/billing?mock_portal=1'})

        if not sub.stripe_customer_id:
            return Response({'detail': 'No payment method on file.'}, status=status.HTTP_400_BAD_REQUEST)

        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        domain = getattr(settings, 'FRONTEND_URL', 'http://localhost:3080')
        session = stripe.billing_portal.Session.create(
            customer=sub.stripe_customer_id,
            return_url=f'{domain}/billing',
        )
        return Response({'portal_url': session.url})
