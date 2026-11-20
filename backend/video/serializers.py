"""CuraBook — Video Session Serializers

Tokens are NOT included in the default list/retrieve responses.
They are generated on-demand via the /token/ action endpoint,
ensuring each token has a fresh 15-minute TTL.
"""
from rest_framework import serializers
from .models import VideoSession


class VideoSessionSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='appointment.doctor.full_name', read_only=True)
    patient_name = serializers.CharField(source='appointment.patient.full_name', read_only=True)
    scheduled_time = serializers.DateTimeField(source='appointment.slot.start', read_only=True)
    """
    Default serializer — no tokens.
    Tokens are fetched separately via GET /api/v1/video/sessions/{id}/token/
    so that every token is freshly generated with a 15-min TTL.
    """

    class Meta:
        model = VideoSession
        fields = [
            'id', 'appointment', 'provider', 'status',
            'room_url', 'doctor_name', 'patient_name', 'scheduled_time',
            'started_at', 'ended_at', 'duration_minutes',
        ]
        read_only_fields = fields


class VideoSessionTokenSerializer(serializers.Serializer):
    """
    Returned by GET /api/v1/video/sessions/{id}/token/
    Contains a freshly generated short-lived token (15 min TTL).
    """
    token    = serializers.CharField()
    room_url = serializers.URLField()
    join_url = serializers.CharField()
    expires_in_seconds = serializers.IntegerField()
