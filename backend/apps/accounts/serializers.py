"""
CuraBook — Accounts Serializers
=================================
Handles: User registration, user info, JWT customization.
Profile serializers live in their own domain apps.
"""

from rest_framework import serializers
from django.contrib.auth import password_validation, get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


# ─────────────────────────────────────────────
class UserSerializer(serializers.ModelSerializer):
    date_joined = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    last_login  = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    current_role = serializers.CharField(read_only=True)
    specialty    = serializers.CharField(source='doctor_profile.specialty', read_only=True, required=False, allow_null=True)
    has_completed_onboarding = serializers.BooleanField(source='doctor_profile.profile_completed', read_only=True, default=False, required=False)

    class Meta:
        model  = User
        fields = (
            "id", "username", "email", "full_name",
            # FIX G: Bilingual name — Latin/English version for EN UI mode
            "full_name_en",
            "phone", "city",
            "role", "current_role", "is_active",
            "is_doctor", "is_patient", "is_assistant", "hospital_admin", "is_platform_admin",
            "specialty", "has_completed_onboarding",
            "date_joined", "last_login",
        )
        read_only_fields = fields


# ─────────────────────────────────────────────
# Registration
# ─────────────────────────────────────────────

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(
        choices=["doctor", "patient", "assistant", "hospital_admin"],
        write_only=True,
    )

    # Doctor extras
    specialty     = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    clinic_name   = serializers.CharField(required=False, allow_blank=True)

    # Patient extras
    age           = serializers.IntegerField(required=False, allow_null=True)

    # Hospital admin extras
    hospital_name    = serializers.CharField(required=False, allow_blank=True)
    hospital_address = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model  = User
        fields = (
            "id", "username", "email", "full_name",
            # FIX G: Accept English name on registration
            "full_name_en",
            "phone", "city",
            "password", "role", "specialty", "date_of_birth", "clinic_name",
            "age",
            "hospital_name", "hospital_address",
        )
        read_only_fields = ("id",)

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(_("Email already exists."))
        return value.lower()

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(_("Username already exists."))
        return value

    def validate_phone(self, value):
        # ✅ FIX: Convert empty string → None to avoid unique=True IntegrityError
        if not value or not value.strip():
            return None
        value = value.strip()
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError(_("Phone number already in use."))
        return value

    def create(self, validated_data):
        role     = validated_data.pop("role")
        password = validated_data.pop("password")

        # Extract extra fields that don't belong to the User model
        specialty        = validated_data.pop("specialty",        "")
        date_of_birth    = validated_data.pop("date_of_birth",    None)
        clinic_name      = validated_data.pop("clinic_name",      "")
        age              = validated_data.pop("age",              None)
        hospital_name    = validated_data.pop("hospital_name",    "")
        hospital_address = validated_data.pop("hospital_address", "")

        # ✅ FIX: Convert empty strings to None for nullable unique fields
        # phone and city are null=True — storing "" causes unique IntegrityError
        if not validated_data.get("phone"):
            validated_data["phone"] = None
        if not validated_data.get("city"):
            validated_data["city"] = None

        # Create User
        user = User.objects.create_user(password=password, **validated_data)
        user.role          = role
        user.is_active     = True        # can be False if email verification required
        user.is_doctor     = role == "doctor"
        user.is_patient    = role == "patient"
        user.is_assistant  = role == "assistant"
        user.hospital_admin = role == "hospital_admin"
        # Hospital admins are app-level admins only. Django staff access is
        # platform-wide and must not be granted during public registration.
        user.is_staff      = False
        user.save()

        # Create domain profiles
        if role == "doctor":
            from ..doctors.models import DoctorProfile
            dp = DoctorProfile.objects.create(user=user, specialty=specialty, date_of_birth=date_of_birth)
            if clinic_name:
                from clinics.models import Clinic
                Clinic.objects.create(owner=dp, name=clinic_name)

        elif role == "patient":
            from ..patients.models import PatientProfile
            # ✅ FIX: Store age from frontend if dob is not provided
            PatientProfile.objects.create(user=user, dob=date_of_birth, age=age)

        elif role == "assistant":
            from ..assistants.models import AssistantProfile
            AssistantProfile.objects.create(user=user)

        elif role == "hospital_admin":
            from hospital.models import Hospital, HospitalAdmin
            # API-06 FIX: use create() instead of get_or_create() so each hospital admin
            # always gets their own Hospital record.
            hospital = Hospital.objects.create(
                name=hospital_name or user.full_name,
                address=hospital_address or "",
                city=validated_data.get("city") or "",
            )
            HospitalAdmin.objects.create(user=user, hospital=hospital)

        return user


# ─────────────────────────────────────────────
# JWT — Custom token with user data
# ─────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # ✅ FIX: Add "success" key so CuraBookRenderer passes this through
        # without wrapping it in { success: true, data: {...} }.
        # Frontend AuthContext reads data.access / data.refresh / data.user directly.
        data["success"] = True
        data["user"] = UserSerializer(self.user).data
        return data


# ─────────────────────────────────────────────
# MeSerializer  (FIX B-05)
# Used by /auth/me/ GET endpoint to return a
# fully-typed serialized response with current_role
# and avatar so the frontend never needs to scan
# boolean flags to detect the user's role.
# ─────────────────────────────────────────────

class MeSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for the current authenticated user.
    Returned by GET /api/v1/auth/me/.

    Key fields that fix audit issues:
      current_role  — normalised role string ("hospital" not "hospital_admin")
                       so frontend ROLE_ROUTES mapping works without patching.
      avatar        — resolved URL from any linked profile (doctor/patient/…)
                       so the nav avatar renders without an extra API round-trip.
    """
    current_role = serializers.CharField(read_only=True)
    avatar       = serializers.SerializerMethodField()
    date_joined  = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    last_login   = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)

    class Meta:
        model  = User
        fields = (
            "id", "username", "email", "full_name",
            # FIX G: Expose English name for profile page and EN UI mode
            "full_name_en",
            "phone", "city",
            "role", "current_role",
            "is_active", "is_doctor", "is_patient", "is_assistant", "hospital_admin", "is_platform_admin",
            "avatar",
            "date_joined", "last_login",
        )
        read_only_fields = fields

    def get_avatar(self, user) -> str | None:
        """
        Returns an avatar URL from whichever profile the user has.
        Checks doctor_profile.profile_image first, then a generic avatar field.
        Returns None if no avatar is set — frontend should show initials fallback.
        """
        try:
            if getattr(user, "is_doctor", False):
                img = getattr(getattr(user, "doctor_profile", None), "profile_image", None)
                if img:
                    return img if isinstance(img, str) else img.url
            generic = getattr(user, "avatar", None)
            if generic:
                return generic if isinstance(generic, str) else generic.url
        except Exception:
            pass
        return None
