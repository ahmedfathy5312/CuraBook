from rest_framework import serializers
from .models import PatientProfile, PatientRecord
from apps.accounts.serializers import UserSerializer


class PatientProfileSerializer(serializers.ModelSerializer):
    user       = UserSerializer(read_only=True)
    # FIX: flatten user fields for frontend (profile.full_name, .email, .phone, .city)
    full_name  = serializers.SerializerMethodField(read_only=True)
    email      = serializers.SerializerMethodField(read_only=True)
    phone      = serializers.SerializerMethodField(read_only=True)
    city       = serializers.SerializerMethodField(read_only=True)
    is_active  = serializers.SerializerMethodField(read_only=True)
    date_joined = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = PatientProfile
        fields = "__all__"

    def get_full_name(self, obj):
        return obj.user.full_name or obj.user.username

    def get_email(self, obj):
        return obj.user.email

    def get_phone(self, obj):
        return getattr(obj.user, "phone", None)

    def get_city(self, obj):
        return getattr(obj.user, "city", None)

    def get_is_active(self, obj):
        return bool(getattr(obj.user, "is_active", False))

    def get_date_joined(self, obj):
        value = getattr(obj.user, "date_joined", None)
        return value.isoformat() if value else None


# FIX BUG-03: PatientRecord serializer
class PatientRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor_name  = serializers.CharField(source="doctor.full_name", read_only=True)

    class Meta:
        model  = PatientRecord
        fields = (
            "id", "patient", "patient_name",
            "doctor", "doctor_name",
            "appointment",
            "chief_complaint", "diagnosis", "treatment_plan", "notes",
            "blood_type", "allergies", "chronic_diseases", "current_medications",
            "visit_date",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "doctor", "doctor_name", "patient_name", "created_at", "updated_at")
