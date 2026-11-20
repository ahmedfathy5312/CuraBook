from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsPatientOwner(BasePermission):
    message = "Only the patient owner can modify this profile."
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.user == request.user
