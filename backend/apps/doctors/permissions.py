from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsDoctorOwner(BasePermission):
    """Only the doctor who owns the profile can write to it."""
    message = "Only the doctor owner can modify this profile."

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.user == request.user
