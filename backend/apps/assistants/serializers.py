from rest_framework import serializers
from .models import AssistantProfile, AssistantShift
from apps.accounts.serializers import UserSerializer
from appointments.serializers import AppointmentListSerializer


class AssistantProfileSerializer(serializers.ModelSerializer):
    user       = UserSerializer(read_only=True)
    workplaces = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model  = AssistantProfile
        fields = "__all__"

    def get_permissions(self, obj):
        return obj.effective_permissions()
    def get_workplaces(self, obj):
        from .selectors import get_assistant_workplaces
        try:
            return get_assistant_workplaces(obj)
        except Exception:
            return {}


class AssistantShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AssistantShift
        fields = ['id', 'place_name', 'place_type', 'doctor_name', 'date', 'start_time', 'end_time', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class AssistantAppointmentListSerializer(AppointmentListSerializer):
    """
    Extends AppointmentListSerializer with extra fields required by the
    assistant dashboard's inline detail panel (patient_email, age, gender, etc).
    """
    patient_email = serializers.EmailField(source="patient.email", read_only=True, default=None)
    age           = serializers.IntegerField(source="patient.patient_profile.age", read_only=True, default=None)
    gender        = serializers.CharField(source="patient.patient_profile.gender", read_only=True, default=None)
    clinic_name   = serializers.CharField(source="clinic.name", read_only=True, default=None)
    notes         = serializers.CharField(source="session_notes", read_only=True, default=None)

    class Meta(AppointmentListSerializer.Meta):
        fields = AppointmentListSerializer.Meta.fields + (
            "patient_email", "age", "gender", "reason", "notes", "clinic_name",
        ) # type: ignore
