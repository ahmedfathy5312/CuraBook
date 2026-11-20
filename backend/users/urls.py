from django.urls import path, include
from rest_framework.routers import SimpleRouter as DefaultRouter

from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    UserProfileView,
    UserViewSet,
    DoctorProfileViewSet,
    DocumentViewSet,
    MeView,
    VerifyEmailView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

app_name = "users"

router = DefaultRouter()
router.register(r'users',    UserViewSet,          basename='user')
router.register(r'doctors',  DoctorProfileViewSet, basename='doctor')
router.register(r'documents', DocumentViewSet,     basename='document')

urlpatterns = [
    # ── Authentication ─────────────────────────────────
    path("register/", RegisterView.as_view(),  name="register"),
    path("login/",    LoginView.as_view(),     name="login"),
    path("logout/",   LogoutView.as_view(),    name="logout"),

    # ── Current user ────────────────────────────────────
    path("me/",       MeView.as_view(),        name="me"),        # ✅ /auth/me/
    path("profile/",  UserProfileView.as_view(), name="profile"),

    # ── Email Verification ──────────────────────────────
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),

    # ── Password Reset ──────────────────────────────────
    path("password-reset/",         PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(),  name="password-reset-confirm"),

    # ── ViewSets ────────────────────────────────────────
    path("", include(router.urls)),
]
