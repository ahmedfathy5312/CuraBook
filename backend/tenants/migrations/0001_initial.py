"""Tenants app — initial migration"""

import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Tenant',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('slug', models.SlugField(unique=True)),
                ('type', models.CharField(choices=[('clinic','Private Clinic'),('hospital','Hospital')], max_length=20)),
                ('logo_url', models.URLField(blank=True)),
                ('primary_color', models.CharField(default='#278C86', max_length=7)),
                ('custom_domain', models.CharField(blank=True, max_length=255, null=True, unique=True)),
                ('has_analytics', models.BooleanField(default=False)),
                ('has_sms_reminders', models.BooleanField(default=True)),
                ('has_custom_branding', models.BooleanField(default=False)),
                ('has_api_access', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='tenant', to=settings.AUTH_USER_MODEL)),
            ],
            options={'indexes': [
                models.Index(fields=['slug'], name='tenants_tenant_slug_idx'),
                models.Index(fields=['owner'], name='tenants_tenant_owner_idx'),
            ]},
        ),
        migrations.CreateModel(
            name='TenantMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('owner','Owner'),('doctor','Doctor'),('assistant','Assistant')], default='doctor', max_length=20)),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='members', to='tenants.tenant')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tenant_memberships', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('tenant', 'user')},
                'indexes': [models.Index(fields=['user', 'tenant'], name='tenants_member_user_tenant_idx')],
            },
        ),
    ]
