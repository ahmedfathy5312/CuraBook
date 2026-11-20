"""
CuraBook — Tenants Domain
==========================
Each Tenant = one billable entity (a Doctor's clinic OR a Hospital).

A Tenant owns:
  - Its own subdomain (slug)
  - Its own feature flags
  - Its own data (enforced by TenantQuerySet — always filters by tenant)

Design: "Shared DB, Separate Schemas" pattern is overkill for this size.
We use Row-Level Security (RLS) via a TenantQuerySet mixin.
The middleware sets request.tenant so views always filter by tenant automatically.
"""

import uuid
from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


class Tenant(models.Model):
    """
    One tenant per subscribing doctor or hospital.
    Created automatically when a subscription is activated.
    """

    class TenantType(models.TextChoices):
        CLINIC   = 'clinic',   'Private Clinic'
        HOSPITAL = 'hospital', 'Hospital'

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name     = models.CharField(max_length=255)
    slug     = models.SlugField(unique=True, help_text="Used for subdomain: slug.curabook.com")
    type     = models.CharField(max_length=20, choices=TenantType.choices)

    # Owner: the doctor or hospital_admin who pays
    owner    = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='tenant',
    )

    # Branding (Enterprise plan)
    logo_url         = models.URLField(blank=True)
    primary_color    = models.CharField(max_length=7, default='#278C86', help_text="Hex color")
    custom_domain    = models.CharField(max_length=255, blank=True, unique=True, null=True)

    # Feature flags (synced from billing plan on subscription change)
    has_analytics       = models.BooleanField(default=False)
    has_sms_reminders   = models.BooleanField(default=True)
    has_custom_branding = models.BooleanField(default=False)
    has_api_access      = models.BooleanField(default=False)

    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['owner']),
        ]

    def __str__(self):
        return f"{self.name} ({self.type})"

    def sync_features_from_plan(self, plan):
        """Called by billing signal when subscription changes."""
        self.has_analytics       = plan.has_analytics
        self.has_sms_reminders   = plan.has_sms_reminders
        self.has_custom_branding = plan.has_custom_branding
        self.has_api_access      = plan.has_api_access
        self.save(update_fields=[
            'has_analytics', 'has_sms_reminders',
            'has_custom_branding', 'has_api_access',
        ])


class TenantMember(models.Model):
    """
    Maps users (doctors, assistants) to a tenant.
    A doctor can be a member of multiple tenants (e.g. their own clinic + a hospital).
    """

    class Role(models.TextChoices):
        OWNER     = 'owner',     'Owner'
        DOCTOR    = 'doctor',    'Doctor'
        ASSISTANT = 'assistant', 'Assistant'

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='members')
    user   = models.ForeignKey(User,   on_delete=models.CASCADE, related_name='tenant_memberships')
    role   = models.CharField(max_length=20, choices=Role.choices, default=Role.DOCTOR)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'user')
        indexes = [models.Index(fields=['user', 'tenant'])]

    def __str__(self):
        return f"{self.user.username} → {self.tenant.name} ({self.role})"
