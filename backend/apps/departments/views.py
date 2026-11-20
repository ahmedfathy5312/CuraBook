"""
CuraBook — Departments Views
==============================
Manage departments within a hospital.
"""

from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated

from core.pagination import StandardPagination
from .models import Department
from .serializers import DepartmentSerializer
from .selectors import get_hospital_departments
from .services import create_department, update_department
from .permissions import IsHospitalAdminForDepartment


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    GET /api/v1/departments/?hospital={id}   → list departments
    POST /api/v1/departments/                → create (hospital admin only)
    PATCH /api/v1/departments/{id}/          → update (hospital admin only)
    """
    serializer_class   = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsHospitalAdminForDepartment]
    pagination_class   = StandardPagination
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ["name"]
    ordering_fields    = ["name"]

    def get_queryset(self):
        hospital_id = self.request.query_params.get("hospital")
        if hospital_id:
            return get_hospital_departments(hospital_id)
        return Department.objects.filter(is_active=True).select_related("hospital")

    def perform_create(self, serializer):
        hospital_id = self.request.data.get("hospital")
        from hospital.models import Hospital
        hospital = Hospital.objects.get(id=hospital_id)
        create_department(
            hospital=hospital,
            name=serializer.validated_data["name"],
            description=serializer.validated_data.get("description", ""),
        )
