"""CuraBook — Tenants Services"""

import re
from django.utils.text import slugify
from .models import Tenant, TenantMember


def _unique_slug(base: str) -> str:
    slug = slugify(base)[:40]
    if not Tenant.objects.filter(slug=slug).exists():
        return slug
    i = 2
    while Tenant.objects.filter(slug=f'{slug}-{i}').exists():
        i += 1
    return f'{slug}-{i}'


def create_tenant_for_owner(user) -> Tenant:
    """
    Creates a Tenant for a newly activated doctor or hospital_admin.
    Called by billing signals when subscription activates.
    """
    if hasattr(user, 'tenant'):
        return user.tenant

    tenant_type = Tenant.TenantType.HOSPITAL if user.hospital_admin else Tenant.TenantType.CLINIC
    name = user.full_name or user.username
    slug = _unique_slug(name)

    tenant = Tenant.objects.create(
        name=name,
        slug=slug,
        type=tenant_type,
        owner=user,
    )

    # Add owner as member
    TenantMember.objects.create(tenant=tenant, user=user, role=TenantMember.Role.OWNER)
    return tenant


def add_member(tenant: Tenant, user, role: str = TenantMember.Role.DOCTOR) -> TenantMember:
    member, _ = TenantMember.objects.get_or_create(
        tenant=tenant,
        user=user,
        defaults={'role': role},
    )
    return member


def remove_member(tenant: Tenant, user) -> None:
    TenantMember.objects.filter(tenant=tenant, user=user).delete()
