"""
CuraBook — Dashboard Serializers
"""
from rest_framework import serializers


class DoctorDashboardSerializer(serializers.Serializer):
    total_appointments  = serializers.IntegerField()
    pending             = serializers.IntegerField()
    confirmed           = serializers.IntegerField()
    completed           = serializers.IntegerField()
    cancelled           = serializers.IntegerField()
    avg_rating          = serializers.FloatField(allow_null=True)
    total_reviews       = serializers.IntegerField()
    today_appointments  = serializers.IntegerField()
    next_slot           = serializers.DateTimeField(allow_null=True)


class HospitalDashboardSerializer(serializers.Serializer):
    hospital_name       = serializers.CharField()
    total_departments   = serializers.IntegerField()
    total_doctors       = serializers.IntegerField()
    total_appointments  = serializers.IntegerField()
    pending             = serializers.IntegerField()
    confirmed           = serializers.IntegerField()
    completed           = serializers.IntegerField()
    today_appointments  = serializers.IntegerField()


class PlatformDashboardSerializer(serializers.Serializer):
    total_users         = serializers.IntegerField()
    total_doctors       = serializers.IntegerField()
    total_patients      = serializers.IntegerField()
    total_hospitals     = serializers.IntegerField()
    total_clinics       = serializers.IntegerField()
    total_appointments  = serializers.IntegerField()
    appointments_today  = serializers.IntegerField()
