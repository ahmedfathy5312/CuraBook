"""
CuraBook — Accounts URLs
==========================
Auth endpoints only. Profile-specific endpoints are in their domain apps.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    RegisterView,
    DoctorRegisterView,
    HospitalRegisterView,
    AssistantRegisterView,
    LoginView,
    LogoutView,
    CookieTokenRefreshView,  # F-01 FIX: reads refresh token from HttpOnly cookie
    MeView,
    ChangePasswordView,
    AvatarUploadView,
    VerifyEmailView,
    ResendVerificationEmailView,
    PasswordResetOTPRequestView,
    PasswordResetOTPVerifyView,
    PasswordResetOTPConfirmView,
    WsTicketView,            # SEC-01: WS ticket for secure WebSocket auth
)

app_name = "accounts"

urlpatterns = [
    # ── Authentication ──────────────────────────────────────
    path("register/",            RegisterView.as_view(),          name="register"),
    path("register/doctor/",     DoctorRegisterView.as_view(),    name="register-doctor"),    # ✅ NEW
    path("register/hospital/",   HospitalRegisterView.as_view(),  name="register-hospital"),  # ✅ NEW
    path("register/assistant/",  AssistantRegisterView.as_view(), name="register-assistant"), # ✅ NEW
    path("login/",             LoginView.as_view(),            name="login"),
    path("logout/",            LogoutView.as_view(),           name="logout"),

    # ── Token ────────────────────────────────────────────────
    # B-02 FIX: Removed duplicate /refresh/ alias — single endpoint only
    # Reads refresh token from HttpOnly cookie (not request body)
    path("token/refresh/",     CookieTokenRefreshView.as_view(), name="token-refresh"),
    path("token/verify/",      TokenVerifyView.as_view(),        name="token-verify"),

    # ── Current User ────────────────────────────────────────
    path("me/",                MeView.as_view(),               name="me"),
    path("me/change-password/", ChangePasswordView.as_view(),  name="change-password"),    # ✅ NEW
    path("me/avatar/",         AvatarUploadView.as_view(),     name="avatar-upload"),      # ✅ NEW

    # ── Email Verification ──────────────────────────────────
    path("verify-email/",          VerifyEmailView.as_view(),             name="verify-email"),
    path("resend-verification/",   ResendVerificationEmailView.as_view(), name="resend-verification"),  # Audit Fix 3.4

    # ── Password Reset (OTP-based, matches frontend flow) ──────────────────
    path("password-reset/",         PasswordResetOTPRequestView.as_view(), name="password-reset"),
    path("password-reset/verify/",  PasswordResetOTPVerifyView.as_view(),  name="password-reset-verify"),
    path("password-reset/confirm/", PasswordResetOTPConfirmView.as_view(), name="password-reset-confirm"),

    # SEC-01 FIX: Short-lived one-time WS ticket — replaces token-in-URL
    path("ws-ticket/",              WsTicketView.as_view(),                name="ws-ticket"),
]
