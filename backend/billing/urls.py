"""CuraBook — Billing URL Configuration"""

from django.urls import path
from .views import (
    BillingPortalView,
    CancelView,
    CheckoutView,
    PlanListView,
    ReactivateView,
    StripeWebhookView,
    SubscriptionDetailView,
    UpgradeView,
)
from .paymob_views import PaymobCheckoutView, PaymobWebhookView

app_name = 'billing'

urlpatterns = [
    # Public
    path('plans/',              PlanListView.as_view(),           name='plan-list'),

    # Authenticated
    path('subscription/',       SubscriptionDetailView.as_view(), name='subscription'),
    path('checkout/',           CheckoutView.as_view(),           name='checkout'),
    path('upgrade/',            UpgradeView.as_view(),            name='upgrade'),
    path('cancel/',             CancelView.as_view(),             name='cancel'),
    path('reactivate/',         ReactivateView.as_view(),         name='reactivate'),
    path('portal/',             BillingPortalView.as_view(),      name='portal'),

    # ── Stripe (دولي) ─────────────────────────────────────────────────────────
    path('webhook/stripe/',     StripeWebhookView.as_view(),      name='stripe-webhook'),

    # ── Paymob (مصر) ──────────────────────────────────────────────────────────
    path('paymob/checkout/',    PaymobCheckoutView.as_view(),     name='paymob-checkout'),
    path('paymob/webhook/',     PaymobWebhookView.as_view(),      name='paymob-webhook'),
]
