"""
CuraBook — Clinics Serializers
================================
Serializers validate data only.
Business logic (create, staff management) lives in clinics/services.py.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Clinic, ClinicStaff
from apps.doctors.serializers import DoctorProfileSerializer

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# ClinicStaffSerializer
# ─────────────────────────────────────────────────────────────────────────────

class ClinicStaffSerializer(serializers.ModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        source="user",
        write_only=True,
    )
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model            = ClinicStaff
        fields           = ["id", "user", "user_id", "role", "is_active", "clinic", "created_at"]
        read_only_fields = ["id", "user", "clinic", "created_at"]

    def validate(self, attrs: dict) -> dict:
        """Doctors cannot be assigned as clinic staff."""
        user = attrs.get("user")
        if user and getattr(user, "is_doctor", False):
            raise serializers.ValidationError("Doctor cannot be clinic staff.")
        return attrs


# ─────────────────────────────────────────────────────────────────────────────
# ClinicSerializer
# ─────────────────────────────────────────────────────────────────────────────

class ClinicSerializer(serializers.ModelSerializer):
    owner = DoctorProfileSerializer(read_only=True)
    staff = ClinicStaffSerializer(many=True, read_only=True)

    class Meta:
        model            = Clinic
        fields           = [
            "id", "name", "slug", "owner",
            "address", "city", "phone",
            "latitude", "longitude",
            "consultation_price", "is_active",
            "metadata", "staff",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "owner", "staff", "created_at", "updated_at"]

    def create(self, validated_data: dict):
        """Delegate clinic creation to service layer."""
        from .services import create_clinic_from_request
        request = self.context.get("request")
        return create_clinic_from_request(
            user=request.user,
            **validated_data,
        )

    def update(self, instance, validated_data: dict):
        """Owner is immutable — remove if caller tried to change it."""
        validated_data.pop("owner", None)
        return super().update(instance, validated_data)
