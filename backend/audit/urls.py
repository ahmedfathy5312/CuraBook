from django.urls import path
from .views import AuditLogListView, AuditLogDetailView

app_name = 'audit'

urlpatterns = [
    # Original path: GET /api/v1/audit/logs/
    path('logs/',           AuditLogListView.as_view(),   name='audit_logs'),
    path('logs/<int:pk>/',  AuditLogDetailView.as_view(), name='audit_log_detail'),

    # Alias for direct access: GET /api/v1/audit/audit-logs/
    # (frontend uses /admin/audit-logs/ which is handled in admin_urls.py)
    path('audit-logs/',     AuditLogListView.as_view(),   name='audit_logs_alias'),
]
