"""CuraBook — Billing Admin"""

from django.contrib import admin
from .models import Invoice, Plan, Subscription, UsageRecord


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'tier', 'price_monthly', 'price_yearly', 'currency', 'is_active']
    list_editable = ['is_active']
    list_filter = ['tier', 'is_active']


class InvoiceInline(admin.TabularInline):
    model = Invoice
    extra = 0
    readonly_fields = ['stripe_invoice_id', 'amount', 'status', 'paid_at']
    can_delete = False


class UsageInline(admin.TabularInline):
    model = UsageRecord
    extra = 0
    readonly_fields = ['month', 'appointments_count', 'clinics_count', 'doctors_count']
    can_delete = False


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['owner', 'plan', 'status', 'interval', 'current_period_end', 'cancel_at_period_end']
    list_filter = ['status', 'plan__tier', 'interval']
    search_fields = ['owner__username', 'owner__email', 'stripe_customer_id']
    readonly_fields = ['id', 'stripe_customer_id', 'stripe_subscription_id', 'created_at']
    inlines = [InvoiceInline, UsageInline]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['stripe_invoice_id', 'subscription', 'amount', 'currency', 'status', 'paid_at']
    list_filter = ['status', 'currency']
    search_fields = ['stripe_invoice_id', 'subscription__owner__username']
    readonly_fields = ['id', 'stripe_invoice_id', 'created_at']
