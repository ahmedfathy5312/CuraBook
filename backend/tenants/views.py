"""CuraBook — Tenants Views"""

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers
from .models import Tenant, TenantMember


class TenantSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.display_name', read_only=True)

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'slug', 'type', 'owner_name',
            'logo_url', 'primary_color',
            'has_analytics', 'has_sms_reminders',
            'has_custom_branding', 'has_api_access',
            'is_active', 'created_at',
        ]


class MyTenantView(APIView):
    """GET /api/v1/tenant/ — Current user's tenant info."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response({'detail': 'No tenant found.'}, status=404)
        return Response(TenantSerializer(tenant).data)

    def patch(self, request):
        """Update branding (Enterprise only)."""
        tenant = getattr(request, 'tenant', None)
        if not tenant or tenant.owner != request.user:
            return Response({'detail': 'Not authorized.'}, status=403)
        allowed = ['name', 'logo_url', 'primary_color']
        for field in allowed:
            if field in request.data:
                setattr(tenant, field, request.data[field])
        tenant.save(update_fields=allowed)
        return Response(TenantSerializer(tenant).data)
