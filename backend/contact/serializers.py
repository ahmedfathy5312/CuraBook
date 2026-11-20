"""CuraBook — Contact Serializers"""

from rest_framework import serializers
from .models import ContactMessage


class ContactMessageSerializer(serializers.ModelSerializer):
    """Validates the incoming contact form payload."""

    name    = serializers.CharField(max_length=255, min_length=2)
    email   = serializers.EmailField()
    subject = serializers.CharField(max_length=255, required=False, allow_blank=True)
    message = serializers.CharField(min_length=10, max_length=5000)

    class Meta:
        model  = ContactMessage
        fields = ("name", "email", "subject", "message")

    def validate_name(self, value):
        return value.strip()

    def validate_message(self, value):
        return value.strip()
