from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsHospitalAdminForDepartment(BasePermission):
    """Only the hospital admin of this hospital can manage its departments."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return (
            request.user.hospital_admin
            and request.user.hospital_admin_links.filter(hospital=obj.hospital).exists()
        )
