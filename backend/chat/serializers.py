"""
chat/serializers.py
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.cache import cache
from .models import Conversation, Message

User = get_user_model()


class ParticipantSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    avatar    = serializers.SerializerMethodField()
    role      = serializers.SerializerMethodField()
    specialty = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'full_name', 'avatar', 'role', 'specialty', 'is_online']

    def get_full_name(self, obj):
        getter = getattr(obj, 'get_full_name', None)
        if callable(getter):
            name = getter()
            if name:
                return name
        return getattr(obj, 'full_name', None) or getattr(obj, 'username', '') or getattr(obj, 'email', '')

    def get_avatar(self, obj):
        try:
            profile = (
                getattr(obj, 'doctorprofile', None)
                or getattr(obj, 'doctor_profile', None)
                or getattr(obj, 'patientprofile', None)
                or getattr(obj, 'patient_profile', None)
            )
            if profile and getattr(profile, 'avatar', None):
                request = self.context.get('request')
                return request.build_absolute_uri(profile.avatar.url) if request else profile.avatar.url
        except Exception:
            pass
        return None

    def get_role(self, obj):
        if getattr(obj, 'is_doctor', False):
            return 'doctor'
        if getattr(obj, 'is_patient', False):
            return 'patient'
        if getattr(obj, 'is_assistant', False):
            return 'assistant'
        return getattr(obj, 'role', None) or (obj.groups.values_list('name', flat=True).first() or 'user')

    def get_specialty(self, obj):
        try:
            profile = getattr(obj, 'doctorprofile', None) or getattr(obj, 'doctor_profile', None)
            return getattr(profile, 'specialty', '') or ''
        except Exception:
            return ''

    def get_is_online(self, obj):
        return bool(cache.get(f'chat_online:{obj.pk}'))


class MessageSerializer(serializers.ModelSerializer):
    sender_name   = serializers.SerializerMethodField()
    sender_avatar = serializers.SerializerMethodField()
    sender_type   = serializers.SerializerMethodField()
    file_url      = serializers.SerializerMethodField()

    class Meta:
        model  = Message
        fields = [
            'id', 'content', 'message_type',
            'sender', 'sender_name', 'sender_avatar', 'sender_type',
            'file_url', 'file_name',
            'is_read', 'created_at', 'edited_at',
        ]
        read_only_fields = ['id', 'sender', 'sender_name', 'sender_avatar', 'sender_type', 'file_url', 'is_read', 'created_at', 'edited_at']

    def get_sender_name(self, obj):
        getter = getattr(obj.sender, 'get_full_name', None)
        if callable(getter):
            name = getter()
            if name:
                return name
        return getattr(obj.sender, 'full_name', None) or getattr(obj.sender, 'username', '') or getattr(obj.sender, 'email', '')

    def get_sender_avatar(self, obj):
        try:
            profile = (
                getattr(obj.sender, 'doctorprofile', None)
                or getattr(obj.sender, 'doctor_profile', None)
                or getattr(obj.sender, 'patientprofile', None)
                or getattr(obj.sender, 'patient_profile', None)
            )
            if profile and getattr(profile, 'avatar', None):
                request = self.context.get('request')
                return request.build_absolute_uri(profile.avatar.url) if request else profile.avatar.url
        except Exception:
            pass
        return None

    def get_sender_type(self, obj):
        request = self.context.get('request')
        if request and request.user.pk == obj.sender_id:
            return 'me'
        return 'other'

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        try:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        except Exception:
            return None


class ConversationSerializer(serializers.ModelSerializer):
    other_participant = serializers.SerializerMethodField()
    last_message      = serializers.SerializerMethodField()
    unread_count      = serializers.SerializerMethodField()

    class Meta:
        model  = Conversation
        fields = ['id', 'other_participant', 'last_message', 'unread_count', 'updated_at']

    def get_other_participant(self, obj):
        request = self.context.get('request')
        user    = request.user if request else None
        other   = obj.other_participant(user) if user else obj.participant_two
        return ParticipantSerializer(other, context=self.context).data

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if not msg:
            return None
        return MessageSerializer(msg, context=self.context).data

    def get_unread_count(self, obj):
        request = self.context.get('request')
        user    = request.user if request else None
        if not user:
            return 0
        return obj.unread_count(user)
