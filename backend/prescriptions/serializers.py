"""
CuraBook — Prescriptions Serializers
=======================================
Validation only. Business logic lives in prescriptions/services.py.
"""

from rest_framework import serializers
from .models import Prescription, PrescriptionMedication
from .services import create_prescription, update_prescription


class PrescriptionMedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PrescriptionMedication
        fields = ("id", "name", "dosage", "frequency", "duration", "notes")


class PrescriptionSerializer(serializers.ModelSerializer):
    medications      = PrescriptionMedicationSerializer(many=True, read_only=True)
    medications_data = PrescriptionMedicationSerializer(
        many=True, write_only=True, required=False
    )
    doctor_name  = serializers.SerializerMethodField(read_only=True)
    patient_name = serializers.SerializerMethodField(read_only=True)
    is_sent      = serializers.SerializerMethodField(read_only=True)
    medication   = serializers.SerializerMethodField(read_only=True)
    dosage       = serializers.SerializerMethodField(read_only=True)
    duration     = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model            = Prescription
        fields           = (
            "id", "doctor", "doctor_name",
            "patient", "patient_name",
            "appointment",
            "diagnosis", "notes", "status",
            "created_at", "updated_at", "sent_at",
            "medications", "medications_data",
            "is_sent", "medication", "dosage", "duration",
        )
        read_only_fields = ("id", "doctor", "status", "sent_at", "created_at", "updated_at")

    def get_doctor_name(self, obj) -> str:
        return obj.doctor.full_name or obj.doctor.username

    def get_patient_name(self, obj) -> str:
        return obj.patient.full_name or obj.patient.username

    def get_is_sent(self, obj) -> bool:
        return obj.status == "SENT"

    def get_medication(self, obj) -> str:
        """Return first medication name as shortcut for list views."""
        first = obj.medications.first()
        return first.name if first else ""

    def get_dosage(self, obj) -> str:
        first = obj.medications.first()
        return first.dosage if first else ""

    def get_duration(self, obj) -> str:
        first = obj.medications.first()
        return first.duration if first else ""

    def create(self, validated_data: dict) -> Prescription:
        """Delegate to service layer."""
        meds_data = validated_data.pop("medications_data", [])
        return create_prescription(medications_data=meds_data, **validated_data)

    def update(self, instance: Prescription, validated_data: dict) -> Prescription:
        """Delegate to service layer."""
        meds_data = validated_data.pop("medications_data", None)
        return update_prescription(
            instance=instance,
            medications_data=meds_data,
            **validated_data,
        )
