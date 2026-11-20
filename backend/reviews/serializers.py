from rest_framework import serializers
from .models import Review

class ReviewSerializer(serializers.ModelSerializer):
    # FIX: use full_name not username/get_full_name
    patient_name = serializers.SerializerMethodField(read_only=True)
    doctor_name  = serializers.SerializerMethodField(read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    appointment_date = serializers.DateTimeField(source='appointment.slot.start', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'appointment',
            'patient',
            'patient_name',
            'doctor',
            'doctor_name',
            'clinic',
            'clinic_name',
            'hospital',
            'hospital_name',
            'appointment_date',
            'rating',
            'comment',
            'is_anonymous',  # v30 API-M07
            'created_at',
        ]
        read_only_fields = ['created_at', 'patient', 'doctor', 'clinic', 'hospital']

    def get_patient_name(self, obj):
        # v30 API-M07: respect is_anonymous flag
        if getattr(obj, 'is_anonymous', False):
            return 'Anonymous'
        u = getattr(obj, 'patient', None)
        return (u.full_name or u.username) if u else ''

    def get_doctor_name(self, obj):
        u = getattr(obj, 'doctor', None)
        return (u.full_name or u.username) if u else ''

