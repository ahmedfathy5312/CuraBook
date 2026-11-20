"""
CuraBook — Tenant Middleware
=============================
Sets request.tenant on every authenticated request.
Views use request.tenant to scope their queries automatically.

Resolution order:
  1. X-Tenant-ID header (API clients)
  2. JWT claim tenant_id
  3. User's own tenant (owner)
  4. First tenant membership
"""

import logging
from .models import Tenant

logger = logging.getLogger('curabook.tenants')


class TenantMiddleware:
    """
    Lightweight tenant resolver. Never blocks a request —
    if no tenant is found, request.tenant = None (views decide what to do).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = self._resolve(request)
        return self.get_response(request)

    def _resolve(self, request):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return None

        # Platform admins see everything — no tenant scoping
        if user.is_platform_admin or user.is_staff:
            return None

        # 0. X-Tenant-Slug from nginx (subdomain routing)
        tenant_slug = request.headers.get('X-Tenant-Slug')
        if tenant_slug:
            try:
                tenant = Tenant.objects.get(slug=tenant_slug, is_active=True)
                if tenant.owner_id == user.pk or tenant.members.filter(user=user).exists():
                    return tenant
            except Tenant.DoesNotExist:
                pass

        # 1. Explicit header (useful for multi-tenant API clients)
        tenant_id = request.headers.get('X-Tenant-ID')
        if tenant_id:
            try:
                tenant = Tenant.objects.get(id=tenant_id, is_active=True)
                # Verify user belongs to this tenant
                if tenant.owner_id == user.pk or tenant.members.filter(user=user).exists():
                    return tenant
            except (Tenant.DoesNotExist, ValueError):
                pass

        # 2. User's own tenant (owner)
        try:
            return user.tenant
        except Tenant.DoesNotExist:
            pass

        # 3. First tenant membership (e.g. assistant working at a clinic)
        membership = (
            user.tenant_memberships
            .select_related('tenant')
            .filter(tenant__is_active=True)
            .first()
        )
        if membership:
            return membership.tenant

        return None
