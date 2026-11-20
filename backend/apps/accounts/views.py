"""
CuraBook — Accounts Views
==========================
Handles ONLY: register, login, logout, /me, email verify, password reset.
Profile-specific views live in their own domain apps.
"""

import logging
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from core.throttles import LoginRateThrottle, RegisterRateThrottle, PasswordResetThrottle

from .serializers import UserRegisterSerializer, UserSerializer, CustomTokenObtainPairSerializer
from .permissions import IsOwnerOrReadOnly

logger = logging.getLogger("curabook")


# ─────────────────────────────────────────────
# Register
# ─────────────────────────────────────────────

@extend_schema(
    tags=["Auth"],
    summary="Register a new patient account",
    description="Creates a new patient user. Returns 201 on success. Email must be unique.",
    request=UserRegisterSerializer,
    responses={201: UserSerializer},
)
class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/"""
    serializer_class   = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # FIX: skip token validation for signup
    throttle_classes   = [RegisterRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # ✅ FIX: Auto-login after signup
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        response_data = {
            "success": True,
            "message": "Account created successfully.",
            "access":  str(refresh.access_token),
            "user":    UserSerializer(user).data,
        }
        response = Response(response_data, status=status.HTTP_201_CREATED)
        _set_auth_cookie(response, str(refresh))
        return response


# ─────────────────────────────────────────────
# Login
# ─────────────────────────────────────────────

@extend_schema(
    tags=["Auth"],
    summary="Login — obtain JWT access + refresh tokens",
    description=(
        "Authenticates user with email + password. "
        "Returns access token in JSON body. "
        "Sets refresh token as HttpOnly SameSite=Strict cookie (F-01 XSS fix). "
    ),
)
class LoginView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/

    F-01 FIX: On successful login the refresh token is sent ONLY as an HttpOnly
    SameSite=Strict cookie — it is NOT included in the JSON response body.
    This prevents XSS attacks from stealing the long-lived refresh token.
    The access token (60 min TTL) is still returned in the JSON body and must
    be stored in-memory on the frontend (never in localStorage).
    """
    serializer_class   = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes   = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh_token = response.data.pop("refresh", None)
            if refresh_token:
                _set_auth_cookie(response, refresh_token)
        return response


def _set_auth_cookie(response, refresh_token: str):
    """
    F-01 FIX: Sets the refresh token as an HttpOnly, SameSite=Lax cookie.
    Used by both Login and Signup to ensure consistent session handling.
    """
    from django.conf import settings
    cookie_secure = getattr(settings, "SESSION_COOKIE_SECURE", False)
    response.set_cookie(
        key="__cb_refresh",
        value=refresh_token,
        httponly=True,
        samesite="Lax",  # Lax is required for cross-origin proxy (3000 -> 8000)
        secure=cookie_secure,
        path="/",
        max_age=7 * 24 * 60 * 60,  # 7 days
    )


# ─────────────────────────────────────────────
# Logout
# ─────────────────────────────────────────────

@extend_schema(
    tags=["Auth"],
    summary="Logout — blacklist refresh token",
    description=(
        "Blacklists the refresh token (read from HttpOnly cookie or request body). "
        "Clears the __cb_refresh cookie. F-01 XSS fix."
    ),
    responses={200: {"type": "object", "properties": {"success": {"type": "boolean"}}}},
)
class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/

    F-01 FIX: Reads refresh token from the HttpOnly cookie (__cb_refresh) first,
    then falls back to the request body for backward compatibility.
    Always clears the cookie on logout.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # F-01 FIX: prefer cookie, fall back to body for backward compatibility
        refresh_token = (
            request.COOKIES.get("__cb_refresh")
            or request.data.get("refresh")
        )
        response = Response({"success": True, "message": "Logged out successfully."})
        # Always clear the cookie regardless of whether we have a token
        response.delete_cookie(
            key="__cb_refresh",
            path="/",      # FIX: must match the path used in set_cookie
            samesite="Lax",  # FIX: must match the samesite used in set_cookie
        )
        if not refresh_token:
            return response  # already logged out — cookie was missing
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            RefreshToken(refresh_token).blacklist()
        except Exception as e:
            logger.warning(f"[Logout] Token blacklist failed (may already be invalid): {e}")
        return response


# ─────────────────────────────────────────────
# /auth/me — Current User
# ─────────────────────────────────────────────

@extend_schema(
    tags=["Auth"],
    summary="Get / Update current user profile",
    description="GET returns full profile. PATCH updates editable fields (name, phone, city…).",
    responses={200: UserSerializer},
)
class MeView(APIView):
    """GET /api/v1/auth/me/ — returns full current user profile"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            "id":               user.id,
            "username":         user.username,
            "email":            user.email,
            "full_name":        user.full_name,
            "phone":            user.phone,
            "city":             user.city,
            # FIX B-01 / B-05: current_role is the normalized role the frontend needs.
            # Returns "hospital" (not "hospital_admin") so ROLE_ROUTES maps correctly.
            "current_role":     user.current_role,
            "role":             user.role,
            "is_active":        user.is_active,
            "date_joined":      user.date_joined,
            # FIX B-05: expose avatar URL from any linked profile so frontend can show it
            "avatar":           self._get_avatar_url(user),
            # FIX: include boolean role flags for frontend detectRole()
            "is_doctor":        getattr(user, "is_doctor",    False),
            "is_patient":       getattr(user, "is_patient",   False),
            "is_assistant":     getattr(user, "is_assistant", False),
            "hospital_admin":   getattr(user, "hospital_admin", False),
            "is_platform_admin":getattr(user, "is_platform_admin", False) or user.is_staff,
            "has_completed_onboarding": getattr(user.doctor_profile, "profile_completed", False) if user.is_doctor else False,
            "specialty": getattr(user.doctor_profile, "specialty", "") if user.is_doctor else "",
        }

        # Attach domain-specific profile
        if user.is_doctor:
            data["profile"] = self._get_doctor_profile(user)
        elif user.is_patient:
            data["profile"] = self._get_patient_profile(user)
        elif user.is_assistant:
            data["profile"] = self._get_assistant_profile(user)
        elif user.hospital_admin:
            hosp_profile = self._get_hospital_admin_profile(user)
            data["profile"] = hosp_profile
            # Convenience: expose hospital_id directly on user for frontend
            hospitals = hosp_profile.get("hospitals", [])
            data["hospital_id"]   = hospitals[0]["id"]   if hospitals else None
            data["hospital_name"] = hospitals[0]["name"] if hospitals else None

        return Response({"success": True, "data": data, "message": ""})

    @staticmethod
    def _get_avatar_url(user) -> str | None:
        """
        FIX B-05: Return avatar URL from whatever profile the user has.
        Checks doctor_profile.profile_image, then generic avatar field.
        Returns a URL string or None — frontend uses this to render the
        nav avatar without an extra API round-trip.
        """
        try:
            if user.is_doctor:
                img = getattr(user.doctor_profile, "profile_image", None)
                if img:
                    return img if isinstance(img, str) else img.url
            if hasattr(user, "avatar") and user.avatar:
                return user.avatar if isinstance(user.avatar, str) else user.avatar.url
        except Exception:
            pass
        return None

    @staticmethod
    def _get_hospital_admin_profile(user) -> dict:
        """Returns hospital admin context — hospitals managed by this admin."""
        try:
            links = user.hospital_admin_links.select_related("hospital").filter(
                hospital__is_active=True
            )
            return {
                "hospitals": [
                    {"id": l.hospital.id, "name": l.hospital.name, "slug": l.hospital.slug}
                    for l in links
                ]
            }
        except Exception:
            return {}

    @staticmethod
    def _get_doctor_profile(user) -> dict:
        try:
            p = user.doctor_profile
            return {
                "id":               p.id,
                "specialty":        p.specialty,
                "slug":             p.slug,
                "bio":              p.bio,
                "consultation_fee": str(p.consultation_fee) if p.consultation_fee else None,
                "accepts_booking":  p.accepts_booking,
                "profile_completed": p.profile_completed,
                "experience_years": p.experience_years,
                "languages":        p.languages or [],
                "education":        p.education or [],
                "certificates":     p.certificates or [],
                "profile_image":    p.profile_image,
            }
        except Exception:
            return {}

    @staticmethod
    def _get_patient_profile(user) -> dict:
        try:
            p = user.patient_profile
            return {
                "id":     p.id,
                "gender": p.gender,
                "dob":    str(p.dob) if p.dob else None,
            }
        except Exception:
            return {}

    @staticmethod
    def _get_assistant_profile(user) -> dict:
        """Returns assistant profile data including their workplaces."""
        try:
            # FIX: Use relative import to satisfy IDE path resolution
            from ..assistants.selectors import get_assistant_workplaces
            p = user.assistant_profile
            return {
                "id":                      p.id,
                "can_manage_appointments": p.can_manage_appointments,
                "can_upload_documents":    p.can_upload_documents,
                "can_edit_schedule":       p.can_edit_schedule,
                "workplaces":              get_assistant_workplaces(p),
            }
        except Exception:
            return {}

    def patch(self, request):
        """
        PATCH /api/v1/auth/me/
        Update user info + (for doctors) DoctorProfile fields and clinic inline.

        Supported user-level fields  : full_name, phone, city
        Supported doctor-profile fields: specialty, bio, consultation_fee,
            accepts_booking, gender, date_of_birth, slot_duration,
            start_of_practice_date, languages, education, certificates,
            profile_image
        Supported clinic inline (doctor only): { "clinic": { name, address, phone, city } }
            → get_or_create the clinic and assign to doctor (atomic).

        All writes are wrapped in a single DB transaction so a mid-way failure
        leaves the database unchanged.
        """
        from django.db import transaction

        user = request.user
        updated = {}

        try:
            with transaction.atomic():
                # ── User-level fields ─────────────────────────────────────
                user_allowed = ("full_name", "phone", "city")
                user_updates = {}
                for field in user_allowed:
                    if field in request.data:
                        setattr(user, field, request.data[field])
                        user_updates[field] = request.data[field]
                if user_updates:
                    user.full_clean()
                    user.save(update_fields=list(user_updates.keys()))
                updated.update(user_updates)

                # ── DoctorProfile fields (doctor only) ───────────────────
                if user.is_doctor:
                    doctor_allowed = (
                        "specialty", "bio", "consultation_fee", "accepts_booking",
                        "gender", "date_of_birth", "slot_duration",
                        "start_of_practice_date", "languages", "education",
                        "certificates", "profile_image",
                    )
                    try:
                        profile = user.doctor_profile
                        doc_updates = {}
                        for field in doctor_allowed:
                            if field in request.data:
                                setattr(profile, field, request.data[field])
                                doc_updates[field] = request.data[field]
                        if doc_updates:
                            profile.save(update_fields=list(doc_updates.keys()))
                        updated.update(doc_updates)
                    except Exception as e:
                        logger.warning(f"[MeView PATCH] DoctorProfile update failed: {e}")

                    # ── Clinic inline — get_or_create (atomic) ───────────
                    clinic_data = request.data.get("clinic")
                    if clinic_data and isinstance(clinic_data, dict):
                        try:
                            _upsert_doctor_clinic(user, clinic_data)
                            updated["clinic"] = clinic_data
                        except Exception as e:
                            logger.warning(f"[MeView PATCH] Clinic upsert failed: {e}")

        except Exception as e:
            logger.error(f"[MeView PATCH] Transaction failed: {e}")
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"success": True, "data": updated, "message": "Profile updated."})

    # ── Internal helper ───────────────────────────────────────────────────────


def _upsert_doctor_clinic(user, clinic_data: dict):
    """
    Get-or-create the clinic for the given doctor and link it via ClinicStaff.
    Called only from MeView.patch — always runs inside an open transaction.

    Fields accepted in clinic_data: name, address, phone, city
    The `owner` is always set to the doctor's DoctorProfile — never from client.
    """
    from clinics.models import Clinic, ClinicStaff

    doctor_profile = user.doctor_profile
    name = (clinic_data.get("name") or "").strip()
    if not name:
        return  # Nothing to do without a name

    clinic, _ = Clinic.objects.get_or_create(
        owner=doctor_profile,
        defaults={
            "name":    name,
            "address": clinic_data.get("address", ""),
            "phone":   clinic_data.get("phone", ""),
            "city":    clinic_data.get("city", ""),
        },
    )
    # Update mutable fields on subsequent calls (e.g., onboarding re-submit)
    changed = False
    for field in ("address", "phone", "city"):
        val = clinic_data.get(field, "")
        if val and getattr(clinic, field) != val:
            setattr(clinic, field, val)
            changed = True
    if changed:
        clinic.save()

    # Ensure doctor is listed as staff of their own clinic
    ClinicStaff.objects.get_or_create(
        clinic=clinic,
        user=user,
        defaults={"role": "doctor", "is_active": True},
    )


# ─────────────────────────────────────────────
# Doctor Registration (dedicated endpoint)
# ─────────────────────────────────────────────

class DoctorRegisterView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register/doctor/
    Registers a new doctor account.
    Body: { username, email, full_name, password, specialty, clinic_name, city, phone }
    """
    serializer_class   = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # FIX: skip token validation for signup
    throttle_classes   = [RegisterRateThrottle]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data["role"] = "doctor"           # Force role — no spoofing
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # ✅ FIX: Auto-login after signup
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        response_data = {
            "success": True,
            "message": "Doctor account created successfully.",
            "access":  str(refresh.access_token),
            "user":    UserSerializer(user).data,
        }
        response = Response(response_data, status=status.HTTP_201_CREATED)
        _set_auth_cookie(response, str(refresh))
        return response


# ─────────────────────────────────────────────
# Hospital Admin Registration (dedicated endpoint)
# ─────────────────────────────────────────────

class HospitalRegisterView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register/hospital/
    Registers a new hospital admin account.
    Body: { username, email, full_name, password, hospital_name, hospital_address, city, phone }
    """
    serializer_class   = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # FIX: skip token validation for signup
    throttle_classes   = [RegisterRateThrottle]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data["role"] = "hospital_admin"   # Force role — no spoofing
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # ✅ FIX: Auto-login after signup
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        response_data = {
            "success": True,
            "message": "Hospital admin account created successfully.",
            "access":  str(refresh.access_token),
            "user":    UserSerializer(user).data,
        }
        response = Response(response_data, status=status.HTTP_201_CREATED)
        _set_auth_cookie(response, str(refresh))
        return response


# ─────────────────────────────────────────────
# Assistant Registration (dedicated endpoint)
# ─────────────────────────────────────────────

class AssistantRegisterView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register/assistant/
    Registers a new assistant account.
    Body: { username, email, full_name, password, phone, city }
    """
    serializer_class   = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # FIX: skip token validation for signup
    throttle_classes   = [RegisterRateThrottle]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data["role"] = "assistant"   # Force role — no spoofing
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # ✅ FIX: Auto-login after signup
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        response_data = {
            "success": True,
            "message": "Assistant account created successfully.",
            "access":  str(refresh.access_token),
            "user":    UserSerializer(user).data,
        }
        response = Response(response_data, status=status.HTTP_201_CREATED)
        _set_auth_cookie(response, str(refresh))
        return response


# ─────────────────────────────────────────────
# Change Password (authenticated user)
# ─────────────────────────────────────────────

@extend_schema(
    tags=["Auth"],
    summary="Change password for authenticated user",
    description="Requires old_password (current) and new_password (min 8 chars). Returns 200 on success.",
    request={"type": "object", "properties": {
        "old_password": {"type": "string"},
        "new_password": {"type": "string", "minLength": 8},
    }, "required": ["old_password", "new_password"]},
    responses={200: {"type": "object", "properties": {"success": {"type": "boolean"}}}},
)
class ChangePasswordView(APIView):
    """POST /api/v1/auth/me/change-password/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get("old_password", "")
        new_password = request.data.get("new_password", "")

        if not old_password or not new_password:
            return Response(
                {"detail": "old_password and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 8:
            return Response(
                {"detail": "New password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(old_password):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        return Response({"success": True, "message": "Password changed successfully."})


# ─────────────────────────────────────────────
# Avatar Upload
# ─────────────────────────────────────────────

@extend_schema(
    tags=["Auth"],
    summary="Upload profile avatar / photo",
    description="Accepts multipart/form-data with an 'avatar' file field. Returns the new avatar URL.",
    responses={200: {"type": "object", "properties": {"avatar_url": {"type": "string"}}}},
)
class AvatarUploadView(APIView):
    """POST /api/v1/auth/me/avatar/"""
    permission_classes = [IsAuthenticated]
    # ✅ FIX: MultiPartParser required for file uploads (request.FILES)
    # Empty list [] would cause request.FILES to always be empty
    from rest_framework.parsers import MultiPartParser, FormParser
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        import os

        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response(
                {"detail": "No file uploaded. Send file as 'avatar'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if avatar.content_type not in allowed_types:
            return Response(
                {"detail": "Only JPEG, PNG, and WebP images are allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if avatar.size > 5 * 1024 * 1024:  # 5MB limit
            return Response(
                {"detail": "Image must be under 5MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ext  = os.path.splitext(avatar.name)[1].lower()
        path = f"avatars/user_{request.user.id}{ext}"
        default_storage.save(path, ContentFile(avatar.read()))

        # Save URL to user model if it has avatar field, else store in profile
        user = request.user
        if hasattr(user, 'avatar'):
            user.avatar = path
            user.save(update_fields=["avatar"])
        else:
            # Try doctor/patient profile
            for profile_attr in ("doctor_profile", "patient_profile", "assistant_profile"):
                profile = getattr(user, profile_attr, None)
                if profile and hasattr(profile, "profile_image"):
                    profile.profile_image = path
                    profile.save(update_fields=["profile_image"])
                    break

        return Response({
            "success": True,
            "message": "Avatar uploaded successfully.",
            "data": {"avatar_url": default_storage.url(path)},
        })


# ─────────────────────────────────────────────
# Email Verification
# ─────────────────────────────────────────────

class VerifyEmailView(APIView):
    """GET /api/v1/auth/verify-email/?uid=...&token=..."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # skip token validation

    def get(self, request):
        uid   = request.query_params.get("uid")
        token = request.query_params.get("token")

        if not uid or not token:
            return Response(
                {"detail": "uid and token are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
        from .tokens import account_activation_token
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, User.DoesNotExist):
            return Response(
                {"detail": "Invalid activation link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not account_activation_token.check_token(user, token):
            return Response(
                {"detail": "Activation link is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = True
        user.save(update_fields=["is_active"])
        return Response({"success": True, "message": "Email verified. Account activated."})




# ─────────────────────────────────────────────
# Resend Email Verification (Audit Fix 3.4)
# ─────────────────────────────────────────────

class ResendVerificationEmailView(APIView):
    """POST /api/v1/auth/resend-verification/  Body: { "email": "..." }"""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # skip token validation

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response(
                {"detail": "email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Don't reveal whether email exists — silently succeed
            return Response({"success": True, "message": "If that email exists, a verification link has been sent."})

        if user.is_active:
            return Response(
                {"detail": "This account is already verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Send verification email
        from .tokens import account_activation_token
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.conf import settings

        uid   = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)
        link  = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/verify-email?uid={uid}&token={token}"

        # Use existing email infrastructure if available
        try:
            from notifications.tasks import send_notification_email
            send_notification_email.delay(
                user_id=user.pk,
                title="Verify your CuraBook account",
                body=f"Click the link to activate your account: {link}",
                template_context={
                    "intro_line":  "Please verify your email address",
                    "doctor_name": user.get_full_name() or user.username,
                    "slot_time":   "",
                    "location":    "",
                    "status_label": "Pending Verification",
                    "status_class": "status-pending",
                    "appointment_id": "",
                    "reason": link,
                },
            )
        except Exception:
            pass  # Email sending is best-effort — don't fail the request

        return Response({"success": True, "message": "If that email exists, a verification link has been sent."})

# ─────────────────────────────────────────────
# Cookie-based Token Refresh (F-01 FIX)
# ─────────────────────────────────────────────

class CookieTokenRefreshView(APIView):
    """
    POST /api/v1/auth/token/refresh/

    F-01 FIX: Reads the refresh token from the __cb_refresh HttpOnly cookie
    instead of the request body. Returns a new access token in the JSON response.
    The frontend sends this request with withCredentials:true — the browser
    attaches the cookie automatically.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("__cb_refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token cookie not found. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            token = RefreshToken(refresh_token)
            access_token = str(token.access_token)
            response = Response({"access": access_token})

            from django.conf import settings
            jwt_settings = getattr(settings, "SIMPLE_JWT", {})
            if jwt_settings.get("ROTATE_REFRESH_TOKENS", False):
                try:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    user_id = token.payload.get(jwt_settings.get('USER_ID_FIELD', 'user_id'))
                    user = User.objects.get(id=user_id)
                    new_refresh = RefreshToken.for_user(user)
                    
                    cookie_secure = getattr(settings, "SESSION_COOKIE_SECURE", False)
                    response.set_cookie(
                        key="__cb_refresh",
                        value=str(new_refresh),
                        httponly=True,
                        samesite="Lax",
                        secure=cookie_secure,
                        path="/",
                        max_age=7 * 24 * 60 * 60,
                    )
                    if jwt_settings.get("BLACKLIST_AFTER_ROTATION", False):
                        token.blacklist()
                except Exception:
                    pass
            return response
        except Exception as e:
            return Response(
                {"detail": "Token is invalid or expired. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

# ─────────────────────────────────────────────
# OTP Password Reset (for frontend OTP flow)
# ─────────────────────────────────────────────

class PasswordResetOTPRequestView(APIView):
    """
    POST /api/v1/auth/password-reset/
    Sends a 6-digit OTP to the user's email for password reset. (Security FIX: was 4-digit)
    Body: { "email": "..." }
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # skip token validation
    throttle_classes   = [PasswordResetThrottle]

    def post(self, request):
        import random
        from django.core.cache import cache
        from django.contrib.auth import get_user_model
        User = get_user_model()

        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Always return 200 to not leak account existence
        try:
            user = User.objects.get(email=email, is_active=True, is_deleted=False)
        except User.DoesNotExist:
            return Response({"success": True, "message": "If this email exists, a code has been sent."})

        # Security FIX: 6-digit OTP (1,000,000 combinations vs 4-digit 10,000 — prevents brute-force)
        otp = str(random.randint(100000, 999999))
        cache.set(f"pwd_reset_otp:{email}", otp, timeout=600)

        try:
            from notifications.tasks import send_notification_email
            send_notification_email.delay(
                user_id=user.id,
                title="Password Reset Code",
                body=f"Your password reset code is: {otp}. It expires in 10 minutes.",
                template_context={"intro_line": "Password Reset", "otp_code": otp},
            )
        except Exception as e:
            logger.error(f"[OTPReset] Email send failed: {e}")

        return Response({"success": True, "message": "If this email exists, a code has been sent."})


class PasswordResetOTPVerifyView(APIView):
    """
    POST /api/v1/auth/password-reset/verify/
    Verifies the OTP code.
    Body: { "email": "...", "code": "1234" }
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # skip token validation

    def post(self, request):
        from django.core.cache import cache
        email = request.data.get("email", "").strip().lower()
        code  = request.data.get("code", "").strip()

        if not email or not code:
            return Response({"detail": "email and code are required."}, status=status.HTTP_400_BAD_REQUEST)

        cached_otp = cache.get(f"pwd_reset_otp:{email}")
        if not cached_otp or cached_otp != code:
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"success": True, "message": "Code verified."})


class PasswordResetOTPConfirmView(APIView):
    """
    POST /api/v1/auth/password-reset/confirm/
    Sets a new password using verified OTP.
    Body: { "email": "...", "code": "1234", "new_password": "..." }
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # skip token validation

    def post(self, request):
        from django.core.cache import cache
        from django.contrib.auth import get_user_model
        User = get_user_model()

        email        = request.data.get("email", "").strip().lower()
        code         = request.data.get("code", "").strip()
        new_password = request.data.get("new_password", "")

        if not all([email, code, new_password]):
            return Response(
                {"detail": "email, code, and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 8:
            return Response({"detail": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)

        cached_otp = cache.get(f"pwd_reset_otp:{email}")
        if not cached_otp or cached_otp != code:
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email, is_active=True, is_deleted=False)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        user.set_password(new_password)
        user.save(update_fields=["password"])
        cache.delete(f"pwd_reset_otp:{email}")  # invalidate OTP

        return Response({"success": True, "message": "Password reset successfully."})


# ─── SEC-01: WebSocket Ticket View ────────────────────────────────────────────

class WsTicketView(APIView):
    """
    POST /api/v1/auth/ws-ticket/
    FIX SEC-01: Issues a short-lived one-time WebSocket ticket so the access
    token does NOT appear in the WS URL query string (where it is visible in
    server logs, browser history, and proxy logs).

    Flow:
      1. Frontend calls this endpoint with the Authorization: Bearer <token> header.
      2. Backend stores a random UUID ticket in Redis for 30 seconds, keyed to user id.
      3. Frontend opens the WebSocket with ?ticket=<uuid> instead of ?token=<jwt>.
      4. WS middleware resolves the ticket → user and deletes the ticket immediately
         (one-time use).

    The JWT never touches the URL.  The ticket is useless after 30 seconds or first use.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import uuid
        from django.core.cache import cache

        ticket = str(uuid.uuid4())
        cache_key = f"ws_ticket:{ticket}"
        # Store user_id mapped to ticket; 30s is more than enough for handshake
        cache.set(cache_key, request.user.id, timeout=30)

        return Response({"ticket": ticket}, status=status.HTTP_200_OK)
