"""Billing app — initial migration"""

from decimal import Decimal
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Plan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('tier', models.CharField(choices=[('free_trial','Free Trial'),('starter','Starter'),('pro','Pro'),('enterprise','Enterprise')], max_length=20, unique=True)),
                ('price_monthly', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=8)),
                ('price_yearly', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=8)),
                ('currency', models.CharField(default='EGP', max_length=3)),
                ('trial_days', models.PositiveIntegerField(default=0)),
                ('max_clinics', models.PositiveIntegerField(default=1)),
                ('max_doctors', models.PositiveIntegerField(default=1)),
                ('max_appointments_per_month', models.PositiveIntegerField(default=50)),
                ('has_analytics', models.BooleanField(default=False)),
                ('has_sms_reminders', models.BooleanField(default=True)),
                ('has_custom_branding', models.BooleanField(default=False)),
                ('has_api_access', models.BooleanField(default=False)),
                ('stripe_price_id_monthly', models.CharField(blank=True, max_length=100)),
                ('stripe_price_id_yearly', models.CharField(blank=True, max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['price_monthly']},
        ),
        migrations.CreateModel(
            name='Subscription',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('interval', models.CharField(choices=[('monthly','Monthly'),('yearly','Yearly')], default='monthly', max_length=10)),
                ('status', models.CharField(choices=[('trialing','Trialing'),('active','Active'),('past_due','Past Due'),('cancelled','Cancelled'),('expired','Expired'),('unpaid','Unpaid')], default='trialing', max_length=20)),
                ('trial_start', models.DateTimeField(blank=True, null=True)),
                ('trial_end', models.DateTimeField(blank=True, null=True)),
                ('current_period_start', models.DateTimeField(blank=True, null=True)),
                ('current_period_end', models.DateTimeField(blank=True, null=True)),
                ('cancelled_at', models.DateTimeField(blank=True, null=True)),
                ('stripe_customer_id', models.CharField(blank=True, db_index=True, max_length=100)),
                ('stripe_subscription_id', models.CharField(blank=True, db_index=True, max_length=100)),
                ('cancel_at_period_end', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='subscription', to=settings.AUTH_USER_MODEL)),
                ('plan', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='subscriptions', to='billing.plan')),
            ],
            options={'indexes': [models.Index(fields=['status'], name='billing_sub_status_idx'), models.Index(fields=['current_period_end'], name='billing_sub_period_end_idx')]},
        ),
        migrations.CreateModel(
            name='Invoice',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('stripe_invoice_id', models.CharField(blank=True, max_length=100, unique=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('currency', models.CharField(default='EGP', max_length=3)),
                ('status', models.CharField(choices=[('draft','Draft'),('open','Open'),('paid','Paid'),('void','Void'),('uncollectible','Uncollectible')], max_length=20)),
                ('period_start', models.DateTimeField()),
                ('period_end', models.DateTimeField()),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('hosted_invoice_url', models.URLField(blank=True)),
                ('invoice_pdf', models.URLField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('subscription', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invoices', to='billing.subscription')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='UsageRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('month', models.DateField(help_text='First day of the billing month')),
                ('appointments_count', models.PositiveIntegerField(default=0)),
                ('clinics_count', models.PositiveIntegerField(default=0)),
                ('doctors_count', models.PositiveIntegerField(default=0)),
                ('subscription', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='usage', to='billing.subscription')),
            ],
            options={'ordering': ['-month'], 'unique_together': {('subscription', 'month')}},
        ),
    ]
