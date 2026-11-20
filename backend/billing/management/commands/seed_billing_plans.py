"""
Management command: seed default billing plans.
Run once after first migration: python manage.py seed_billing_plans
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from billing.models import Plan


class Command(BaseCommand):
    help = 'Seed default CuraBook billing plans'

    def handle(self, *args, **options):
        plans = [
            {
                'name': 'Free Trial',
                'tier': Plan.Tier.FREE_TRIAL,
                'price_monthly': Decimal('0.00'),
                'price_yearly': Decimal('0.00'),
                'trial_days': 14,
                'max_clinics': 1,
                'max_doctors': 1,
                'max_appointments_per_month': 30,
                'has_analytics': False,
                'has_sms_reminders': False,
                'has_custom_branding': False,
                'has_api_access': False,
            },
            {
                'name': 'Starter',
                'tier': Plan.Tier.STARTER,
                'price_monthly': Decimal('199.00'),
                'price_yearly': Decimal('1990.00'),
                'trial_days': 0,
                'max_clinics': 1,
                'max_doctors': 1,
                'max_appointments_per_month': 200,
                'has_analytics': False,
                'has_sms_reminders': True,
                'has_custom_branding': False,
                'has_api_access': False,
            },
            {
                'name': 'Pro',
                'tier': Plan.Tier.PRO,
                'price_monthly': Decimal('499.00'),
                'price_yearly': Decimal('4990.00'),
                'trial_days': 0,
                'max_clinics': 3,
                'max_doctors': 5,
                'max_appointments_per_month': 0,  # unlimited
                'has_analytics': True,
                'has_sms_reminders': True,
                'has_custom_branding': False,
                'has_api_access': False,
            },
            {
                'name': 'Enterprise',
                'tier': Plan.Tier.ENTERPRISE,
                'price_monthly': Decimal('999.00'),
                'price_yearly': Decimal('9990.00'),
                'trial_days': 0,
                'max_clinics': 0,  # unlimited
                'max_doctors': 0,  # unlimited
                'max_appointments_per_month': 0,  # unlimited
                'has_analytics': True,
                'has_sms_reminders': True,
                'has_custom_branding': True,
                'has_api_access': True,
            },
        ]

        for plan_data in plans:
            obj, created = Plan.objects.update_or_create(
                tier=plan_data['tier'],
                defaults=plan_data,
            )
            action = 'Created' if created else 'Updated'
            self.stdout.write(self.style.SUCCESS(f'{action}: {obj.name} ({obj.tier}) — {obj.price_monthly} EGP/month'))

        self.stdout.write(self.style.SUCCESS('\n✅ Billing plans seeded successfully.'))
        self.stdout.write('Next steps:')
        self.stdout.write('  1. Set STRIPE_SECRET_KEY in .env')
        self.stdout.write('  2. Create matching products/prices in Stripe dashboard')
        self.stdout.write('  3. Update stripe_price_id_monthly / stripe_price_id_yearly on each plan')
