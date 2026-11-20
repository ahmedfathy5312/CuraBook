from rest_framework import serializers


class GlobalAnalyticsSerializer(serializers.Serializer):
    total_patients = serializers.IntegerField()
    total_doctors = serializers.IntegerField()
    total_hospitals = serializers.IntegerField()
    total_clinics = serializers.IntegerField()

    total_appointments = serializers.IntegerField()
    accepted_appointments = serializers.IntegerField()
    rejected_appointments = serializers.IntegerField()
    pending_appointments = serializers.IntegerField()
    cancelled_appointments = serializers.IntegerField()

    total_notifications = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()

    total_searches = serializers.IntegerField()


class DoctorAnalyticsSerializer(serializers.Serializer):
    doctor_id = serializers.IntegerField()
    doctor_name = serializers.CharField()

    total_patients = serializers.IntegerField()
    total_appointments = serializers.IntegerField()

    accepted_appointments = serializers.IntegerField()
    rejected_appointments = serializers.IntegerField()
    cancelled_appointments = serializers.IntegerField()

    today_appointments = serializers.IntegerField()
    upcoming_appointments = serializers.IntegerField()

    unread_notifications = serializers.IntegerField()


class HospitalAnalyticsSerializer(serializers.Serializer):
    hospital_id = serializers.IntegerField()
    hospital_name = serializers.CharField()

    total_doctors = serializers.IntegerField()
    total_clinics = serializers.IntegerField()

    total_appointments = serializers.IntegerField()
    accepted_appointments = serializers.IntegerField()
    rejected_appointments = serializers.IntegerField()
    pending_appointments = serializers.IntegerField()

    today_appointments = serializers.IntegerField()
