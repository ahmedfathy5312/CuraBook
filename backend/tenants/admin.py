"""CuraBook — Tenants Admin"""

from django.contrib import admin
from .models import Tenant, TenantMember


class TenantMemberInline(admin.TabularInline):
    model = TenantMember
    extra = 0
    raw_id_fields = ['user']


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display  = ['name', 'slug', 'type', 'owner', 'is_active', 'created_at']
    list_filter   = ['type', 'is_active']
    search_fields = ['name', 'slug', 'owner__username', 'owner__email']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [TenantMemberInline]


@admin.register(TenantMember)
class TenantMemberAdmin(admin.ModelAdmin):
    list_display  = ['user', 'tenant', 'role', 'joined_at']
    list_filter   = ['role']
    search_fields = ['user__username', 'tenant__name']
