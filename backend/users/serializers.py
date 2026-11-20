"""
CuraBook — Users Serializers
==============================
Serializers are responsible for:
  • Input validation (field types, uniqueness checks, password strength)
  • Output representation (read_only, computed fields)

Business logic (DB writes, profile creation, role setup) lives in:
  • users/services/registration_service.py  — register_user()
  • users/services/document_service.py      — create_document()
"""

from rest_framework import serializers
from django.contrib.auth import password_validation, get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import DoctorProfile, PatientProfile, AssistantProfile, Document
from .services import register_user, create_document

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# UserSerializer  (read-only, used in nested contexts)
# ─────────────────────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    date_joined = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    last_login  = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)

    class Meta:
        model  = User
        fields = (
            "id", "username", "email", "full_name", "phone", "city",
            "role", "is_active", "is_doctor", "is_patient", "is_assistant",
            "hospital_admin", "is_platform_admin", "date_joined", "last_login",
        )
        read_only_fields = fields


# ─────────────────────────────────────────────────────────────────────────────
# UserRegisterSerializer  (validation only — creation delegated to service)
# ─────────────────────────────────────────────────────────────────────────────

class UserRegisterSerializer(serializers.Serializer):
    """
    Validates registration data and calls register_user() service.
    No ORM writes happen here.
    """

    username  = serializers.CharField(max_length=150)
    email     = serializers.EmailField()
    password  = serializers.CharField(write_only=True)
    full_name = serializers.CharField(required=False, allow_blank=True, default="")
    phone     = serializers.CharField(required=False, allow_blank=True, default="")
    city      = serializers.CharField(required=False, allow_blank=True, default="")
    role      = serializers.ChoiceField(
        choices=["doctor", "patient", "assistant", "hospital_admin"]
    )

    # Doctor extras
    specialty    = serializers.CharField(required=False, allow_blank=True, default="")
    age          = serializers.IntegerField(required=False, allow_null=True, default=None)
    clinic_name  = serializers.CharField(required=False, allow_blank=True, default="")

    # Hospital admin extras
    hospital_name    = serializers.CharField(required=False, allow_blank=True, default="")
    hospital_address = serializers.CharField(required=False, allow_blank=True, default="")

    # ── Field-level validators ────────────────────────────────────────────────

    def validate_password(self, value: str) -> str:
        password_validation.validate_password(value)
        return value

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(_("Email already exists."))
        return value

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(_("Username already exists."))
        return value

    # ── Service delegation ────────────────────────────────────────────────────

    def create(self, validated_data: dict) -> User:
        """Delegate all DB work to the registration service."""
        return register_user(**validated_data)

    def to_representation(self, instance: User) -> dict:
        return UserSerializer(instance).data


# ─────────────────────────────────────────────────────────────────────────────
# Profile Serializers  (read-only)
# ─────────────────────────────────────────────────────────────────────────────

class DoctorProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model  = DoctorProfile
        fields = "__all__"


class PatientProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model  = PatientProfile
        fields = "__all__"


class AssistantProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model  = AssistantProfile
        fields = "__all__"


# ─────────────────────────────────────────────────────────────────────────────
# DocumentSerializer
# ─────────────────────────────────────────────────────────────────────────────

class DocumentSerializer(serializers.ModelSerializer):
    owner        = UserSerializer(read_only=True)
    download_url = serializers.SerializerMethodField()

    class Meta:
        model            = Document
        fields           = "__all__"
        read_only_fields = ("owner", "uploaded_at")

    def get_download_url(self, obj) -> str:
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url

    def create(self, validated_data: dict) -> Document:
        """Delegate to document service — serializer stays DB-free."""
        return create_document(
            owner=self.context["request"].user,
            **validated_data,
        )


# ─────────────────────────────────────────────────────────────────────────────
# JWT Login Serializer
# ─────────────────────────────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs: dict) -> dict:
        data          = super().validate(attrs)
        data["user"]  = UserSerializer(self.user).data
        return data
