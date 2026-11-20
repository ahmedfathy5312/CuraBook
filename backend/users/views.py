"""
CuraBook — Users Views (HARDENED)
===================================
Fixes applied:
  1. UserViewSet — role-scoped queryset, excludes soft-deleted users
  2. PatientProfileViewSet — patients see only own profile, admins see all
  3. AssistantProfileViewSet — assistants see only own profile
  4. LogoutView — blacklists refresh token on logout
  5. DoctorProfileViewSet — removed non-existent 'hospital' field from select_related
"""

from rest_framework import generics, status, viewsets, permissions, filters
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from core.throttles import LoginRateThrottle, RegisterRateThrottle, PasswordResetThrottle
from core.permissions.policies import UserProfilePolicy

from .serializers import (
    UserRegisterSerializer,
    UserSerializer,
    DoctorProfileSerializer,
    PatientProfileSerializer,
    AssistantProfileSerializer,
    DocumentSerializer,
    CustomTokenObtainPairSerializer,
)

from .models import (
    User,
    DoctorProfile,
    PatientProfile,
    AssistantProfile,
    Document,
)

from .permissions import (
    IsDoctorOrReadOnly,
    IsOwnerOrReadOnly,
)


# ─────────────────────────────────────────────────────
# Pagination
# ─────────────────────────────────────────────────────
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ─────────────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────────────
class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "User account created successfully",
                "user": {
                    "id":       user.id,
                    "username": user.username,
                    "email":    user.email,
                    "role":     user.role,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # ✅ FIX #22: Record failed login attempts for auto-IP-ban
        if response.status_code in (400, 401):
            from core.ip_blocking import record_failed_attempt
            ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() \
                 or request.META.get('REMOTE_ADDR', '')
            if ip:
                record_failed_attempt(ip, reason='login_failure')

        # ✅ v30 MISS-09: Audit log login events
        if response.status_code == 200:
            from audit.services import log_action
            from audit.models import AuditLog
            # Identify user by email/username from request
            identifier = request.data.get('email') or request.data.get('username', '')
            try:
                user = User.objects.get(email=identifier) if '@' in identifier \
                    else User.objects.get(username=identifier)
            except User.DoesNotExist:
                user = None
            log_action(
                actor=user,
                action=AuditLog.Action.LOGIN,
                metadata={'method': 'jwt', 'identifier': identifier},
                request=request,
            )
        elif response.status_code in (400, 401):
            from audit.services import log_action
            from audit.models import AuditLog
            identifier = request.data.get('email') or request.data.get('username', '')
            log_action(
                actor=None,
                action=AuditLog.Action.LOGIN,
                metadata={'method': 'jwt', 'identifier': identifier, 'failed': True},
                request=request,
            )

        return response


class LogoutView(APIView):
    """
    Blacklists the provided refresh token on logout.
    Requires: { "refresh": "<refresh_token>" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            token = RefreshToken(refresh_token)
            token.blacklist()

            # ✅ v30 MISS-09: Audit log logout events
            from audit.services import log_action
            from audit.models import AuditLog
            log_action(
                actor=request.user,
                action=AuditLog.Action.LOGOUT,
                metadata={'method': 'jwt_blacklist'},
                request=request,
            )

            return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ─────────────────────────────────────────────────────
# Users — FIXED: role-scoped, excludes soft-deleted
# ─────────────────────────────────────────────────────
class UserViewSet(viewsets.ModelViewSet):
    """
    FIXED: Previously exposed ALL users to any authenticated user.
    Now scoped by role:
      - Platform admin → all active users
      - Others         → only own record
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, UserProfilePolicy]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'full_name', 'phone']
    ordering_fields = ['date_joined', 'username']

    def get_queryset(self):
        user = self.request.user
        base_qs = User.objects.filter(is_active=True, is_deleted=False).order_by('-date_joined')

        # Platform admin sees everyone
        if getattr(user, 'is_platform_admin', False) or user.is_staff:
            return base_qs

        # Everyone else sees only themselves
        return base_qs.filter(pk=user.pk)

    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        user = self.get_object()
        if request.user != user and not request.user.is_superuser:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        password = request.data.get('password')
        if not password:
            return Response({"detail": "Password required."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save()
        return Response({"detail": "Password updated successfully."})


# ─────────────────────────────────────────────────────
# Doctor Profile
# ─────────────────────────────────────────────────────
class DoctorProfileViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorProfileSerializer
    permission_classes = [IsAuthenticated, IsDoctorOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__username', 'user__email', 'specialty']
    ordering_fields = ['user__username', 'specialty']

    def get_queryset(self):
        user = self.request.user
        qs = DoctorProfile.objects.select_related('user').filter(
            user__is_active=True, user__is_deleted=False
        )
        # Doctors see only their own profile (write), but everyone can read
        if getattr(user, 'is_doctor', False) and self.request.method not in ['GET', 'HEAD', 'OPTIONS']:
            return qs.filter(user=user)
        return qs

    @action(detail=True, methods=['post'])
    def add_assistant(self, request, pk=None):
        doctor = self.get_object()
        user = request.user

        if user != doctor.user and not user.hospital_admin and not user.is_superuser:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        username = data.get('username')
        email    = data.get('email')
        password = data.get('password')

        if not all([username, email, password]):
            return Response(
                {"detail": "username, email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response({"detail": "Username already exists."}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({"detail": "Email already exists."}, status=400)

        assistant_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role='assistant',
            is_assistant=True,
            is_active=True,
            is_staff=False,
        )
        AssistantProfile.objects.create(
            user=assistant_user,
            can_manage_appointments=bool(data.get('can_manage_appointments', False)),
            can_upload_documents=bool(data.get('can_upload_documents', False)),
        )

        return Response(
            {"detail": "Assistant created successfully.", "assistant_id": assistant_user.id},
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────
# Patient Profile — FIXED: own profile only
# ─────────────────────────────────────────────────────
class PatientProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """
    FIXED: Was exposing ALL patient profiles.
    Now: patients see only their own profile; admins see all.
    """
    serializer_class = PatientProfileSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        user = self.request.user
        qs = PatientProfile.objects.select_related('user').filter(
            user__is_active=True, user__is_deleted=False
        )
        if getattr(user, 'is_platform_admin', False) or user.is_staff:
            return qs
        # Regular users see only their own
        return qs.filter(user=user)


# ─────────────────────────────────────────────────────
# Assistant Profile — FIXED: own profile only
# ─────────────────────────────────────────────────────
class AssistantProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """
    FIXED: Was exposing ALL assistant profiles.
    Now: assistants see only their own profile.
    """
    serializer_class = AssistantProfileSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        user = self.request.user
        qs = AssistantProfile.objects.select_related('user').filter(
            user__is_active=True, user__is_deleted=False
        )
        if getattr(user, 'is_platform_admin', False) or user.is_staff:
            return qs
        return qs.filter(user=user)


# ─────────────────────────────────────────────────────
# Documents — own only
# ─────────────────────────────────────────────────────
class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description']
    ordering_fields = ['uploaded_at']

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.select_related('owner')
        if user.is_superuser:
            return qs
        return qs.filter(owner=user)


# ─────────────────────────────────────────────────────
# /auth/me — Current User Info
# ─────────────────────────────────────────────────────
class MeView(APIView):
    """
    GET /auth/me
    Returns the currently authenticated user's full profile
    including role-specific sub-profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            "id":         user.id,
            "username":   user.username,
            "email":      user.email,
            "full_name":  user.full_name,
            "phone":      user.phone,
            "city":       user.city,
            "role":       user.role or user.current_role,
            "is_active":  user.is_active,
            "date_joined": user.date_joined,
        }

        # Attach role-specific profile
        if getattr(user, 'is_doctor', False):
            try:
                p = user.doctor_profile
                data["doctor_profile"] = {
                    "id":              p.id,
                    "specialty":       p.specialty,
                    "slug":            p.slug,
                    "bio":             p.bio,
                    "consultation_fee": str(p.consultation_fee) if p.consultation_fee else None,
                    "accepts_booking": p.accepts_booking,
                    "profile_completed": p.profile_completed,
                }
            except Exception:
                pass

        elif getattr(user, 'is_patient', False):
            try:
                p = user.patient_profile
                data["patient_profile"] = {
                    "id":     p.id,
                    "gender": p.gender,
                    "dob":    str(p.dob) if p.dob else None,
                }
            except Exception:
                pass

        elif getattr(user, 'is_assistant', False):
            try:
                p = user.assistant_profile
                data["assistant_profile"] = {
                    "id":                     p.id,
                    "can_manage_appointments": p.can_manage_appointments,
                    "can_upload_documents":   p.can_upload_documents,
                    "can_edit_schedule":      p.can_edit_schedule,
                }
                # Add workplaces
                from users.selectors import get_assistant_workplaces
                wp = get_assistant_workplaces(p)
                data["workplaces"] = wp
            except Exception:
                pass

        return Response({"success": True, "data": data, "message": ""})


# ─────────────────────────────────────────────────────
# Email Verification
# ─────────────────────────────────────────────────────
class VerifyEmailView(APIView):
    """
    GET /auth/verify-email/?uid=<uid>&token=<token>
    Activates a newly registered user account.
    """
    permission_classes = [permissions.AllowAny]

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
        return Response(
            {"detail": "Email verified. Account activated successfully."},
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────
# Password Reset Request
# ─────────────────────────────────────────────────────
class PasswordResetRequestView(APIView):
    """
    POST /auth/password-reset/
    Body: { "email": "user@example.com" }
    Sends a password reset link to the email.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes   = [PasswordResetThrottle]

    def post(self, request):
        import logging
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.conf import settings

        logger = logging.getLogger("curabook")
        email = request.data.get("email", "").strip().lower()

        if not email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Always return 200 — don't leak whether email exists
        try:
            user = User.objects.get(email=email, is_active=True, is_deleted=False)
        except User.DoesNotExist:
            return Response(
                {"detail": "If this email exists, a reset link has been sent."},
                status=status.HTTP_200_OK,
            )

        uid   = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = (
            f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}"
            f"/auth/reset-password?uid={uid}&token={token}"
        )

        # Queue email via Celery
        try:
            from notifications.tasks import send_notification_email
            send_notification_email.delay(
                user_id=user.id,
                title="Password Reset",
                body=f"Click the link to reset your password: {reset_url}",
                template_context={
                    "intro_line":  "You requested a password reset",
                    "reset_url":   reset_url,
                    "doctor_name": user.full_name or user.username,
                },
            )
        except Exception as e:
            logger.error(f"[PasswordReset] Email queue failed: {e}")

        return Response(
            {"detail": "If this email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────
# Password Reset Confirm
# ─────────────────────────────────────────────────────
class PasswordResetConfirmView(APIView):
    """
    POST /auth/password-reset/confirm/
    Body: { "uid": "...", "token": "...", "new_password": "..." }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str

        uid          = request.data.get("uid")
        token        = request.data.get("token")
        new_password = request.data.get("new_password")

        if not all([uid, token, new_password]):
            return Response(
                {"detail": "uid, token, and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, User.DoesNotExist):
            return Response(
                {"detail": "Invalid reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Reset link is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {"detail": "Password has been reset successfully."},
            status=status.HTTP_200_OK,
        )
