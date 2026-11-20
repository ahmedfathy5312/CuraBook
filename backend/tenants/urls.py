"""CuraBook — Tenants URLs"""

from django.urls import path
from .views import MyTenantView

app_name = 'tenants'

urlpatterns = [
    path('', MyTenantView.as_view(), name='my-tenant'),
]
