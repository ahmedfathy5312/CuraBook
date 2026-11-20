from rest_framework import serializers

from .models import (
    Hospital,
    Department,
    HospitalDoctor,
    HospitalStaff,
    HospitalDocument
)

from scheduling.models import GeneratedSlot
from appointments.models import Appointment


# ==================================================
# Hospital Serializer
# ==================================================
class HospitalSerializer(serializers.ModelSerializer):
    admin_email = serializers.SerializerMethodField()
    admin_phone = serializers.SerializerMethodField()
    specialties = serializers.SerializerMethodField()

    class Meta:
        model = Hospital
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

    def get_admin_email(self, obj):
        admin = obj.admins.first()
        return admin.user.email if admin else None

    def get_admin_phone(self, obj):
        admin = obj.admins.first()
        return admin.user.phone if admin else None

    def get_specialties(self, obj):
        """Return list of department names as specialties."""
        try:
            return list(
                obj.app_departments.filter(is_active=True).values_list('name', flat=True)
            )
        except Exception:
            return []

 

# ==================================================
# Department Serializer
# ==================================================
class DepartmentSerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(
        source='hospital.name',
        read_only=True
    )

    class Meta:
        model = Department
        fields = '__all__'


# ==================================================
# Hospital Doctor Serializer (LINK MODEL)
# ==================================================
class HospitalDoctorSerializer(serializers.ModelSerializer):
    # -------- Doctor Info --------
    doctor_name = serializers.CharField(
        source='user.full_name',
        read_only=True
    )
    username = serializers.CharField(
        source='user.username',
        read_only=True
    )
    phone = serializers.CharField(
        source='user.phone',
        read_only=True
    )

    # -------- Doctor Profile --------
    specialty = serializers.CharField(
        source='user.doctor_profile.specialty',
        read_only=True
    )
    bio = serializers.CharField(
        source='user.doctor_profile.bio',
        read_only=True
    )
    accepts_booking = serializers.BooleanField(
        source='user.doctor_profile.accepts_booking',
        read_only=True
    )
    slot_duration = serializers.IntegerField(
        source='user.doctor_profile.slot_duration',
        read_only=True
    )

    # -------- Hospital Info --------
    hospital_name = serializers.CharField(
        source='hospital.name',
        read_only=True
    )
    department_name = serializers.CharField(
        source='department.name',
        read_only=True
    )

    class Meta:
        model = HospitalDoctor
        fields = (
            'id',
            'user',
            'username',
            'doctor_name',
            'phone',
            'specialty',
            'bio',
            'accepts_booking',
            'slot_duration',
            'hospital',
            'hospital_name',
            'department',
            'department_name',
            'is_active'
        )


# ==================================================
# Hospital Staff Serializer
# ==================================================
class HospitalStaffSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(
        source='user.full_name',
        read_only=True
    )
    hospital_name = serializers.CharField(
        source='hospital.name',
        read_only=True
    )

    class Meta:
        model = HospitalStaff
        fields = '__all__'


# ==================================================
# Hospital Document Serializer
# ==================================================
class HospitalDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.full_name',
        read_only=True
    )
    hospital_name = serializers.CharField(
        source='hospital.name',
        read_only=True
    )

    class Meta:
        model = HospitalDocument
        fields = '__all__'
        read_only_fields = ('uploaded_by', 'uploaded_at')


# ==================================================
# Generated Slots Serializer (READ ONLY)
# ==================================================
class HospitalSlotSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(
        source='doctor.full_name',
        read_only=True
    )
    hospital_name = serializers.SerializerMethodField()

    class Meta:
        model = GeneratedSlot
        fields = (
            'id',
            'doctor',
            'doctor_name',
            'hospital_name',
            'start',
            'end',
            'is_booked',
            'is_active'
        )
        read_only_fields = fields

    def get_hospital_name(self, obj):
        link = obj.doctor.hospital_doctor_links.first()
        return link.hospital.name if link else None


# ==================================================
# Appointments Serializer (READ ONLY)
# ==================================================
class HospitalAppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(
        source='doctor.full_name',
        read_only=True
    )
    patient_name = serializers.CharField(
        source='patient.full_name',
        read_only=True
    )
    hospital_name = serializers.SerializerMethodField()

    class Meta:
       # model = Appointment
        fields = (
            'id',
            'doctor',
            'doctor_name',
            'patient',
            'patient_name',
            'hospital_name',
            'start',
            'end',
            'status',
            'notes'
        )
        read_only_fields = fields

    def get_hospital_name(self, obj):
        link = obj.doctor.hospital_doctor_links.first()
        return link.hospital.name if link else None
