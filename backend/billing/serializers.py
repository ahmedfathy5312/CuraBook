"""CuraBook — Billing Serializers"""

from rest_framework import serializers
from .models import Invoice, Plan, Subscription, UsageRecord


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            'id', 'name', 'tier', 'price_monthly', 'price_yearly', 'currency',
            'trial_days', 'max_clinics', 'max_doctors', 'max_appointments_per_month',
            'has_analytics', 'has_sms_reminders', 'has_custom_branding', 'has_api_access',
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            'id', 'amount', 'currency', 'status',
            'period_start', 'period_end', 'paid_at',
            'hosted_invoice_url', 'invoice_pdf', 'created_at',
        ]


class UsageSerializer(serializers.ModelSerializer):
    appointments_limit = serializers.SerializerMethodField()
    clinics_limit      = serializers.SerializerMethodField()
    doctors_limit      = serializers.SerializerMethodField()

    class Meta:
        model = UsageRecord
        fields = [
            'month', 'appointments_count', 'appointments_limit',
            'clinics_count', 'clinics_limit',
            'doctors_count', 'doctors_limit',
        ]

    def get_appointments_limit(self, obj):
        return obj.subscription.plan.max_appointments_per_month

    def get_clinics_limit(self, obj):
        return obj.subscription.plan.max_clinics

    def get_doctors_limit(self, obj):
        return obj.subscription.plan.max_doctors


class SubscriptionSerializer(serializers.ModelSerializer):
    plan       = PlanSerializer(read_only=True)
    invoices   = InvoiceSerializer(many=True, read_only=True)
    usage      = serializers.SerializerMethodField()
    days_remaining = serializers.IntegerField(read_only=True)
    is_active  = serializers.BooleanField(read_only=True)
    is_trial   = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'interval', 'status',
            'trial_start', 'trial_end',
            'current_period_start', 'current_period_end',
            'cancel_at_period_end', 'cancelled_at',
            'days_remaining', 'is_active', 'is_trial',
            'invoices', 'usage', 'created_at',
        ]

    def get_usage(self, obj):
        from .services import get_or_create_usage
        record = get_or_create_usage(obj)
        return UsageSerializer(record).data


class CheckoutSerializer(serializers.Serializer):
    plan_tier = serializers.ChoiceField(choices=[t.value for t in Plan.Tier])
    interval  = serializers.ChoiceField(choices=['monthly', 'yearly'], default='monthly')


class CancelSerializer(serializers.Serializer):
    at_period_end = serializers.BooleanField(default=True)
