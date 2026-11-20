"""
CuraBook — Admin API URLs (Frontend Contract)
=============================================
Maps /api/v1/admin/* paths used by frontend apiRoutes.js
to the correct backend views.

Frontend constants (apiRoutes.js):
  ADMIN.STATS           → GET  /api/v1/admin/stats/
  ADMIN.AUDIT_LOGS      → GET  /api/v1/admin/audit-logs/
  ADMIN.HOSPITALS       → GET  /api/v1/admin/hospitals/
  ADMIN.TOGGLE_HOSPITAL → POST /api/v1/admin/hospitals/{id}/toggle/
  ADMIN.DOCTORS         → GET  /api/v1/admin/doctors/
  ADMIN.TOGGLE_DOCTOR   → POST /api/v1/admin/doctors/{id}/toggle/
  ADMIN.PATIENTS        → GET  /api/v1/admin/patients/
  ADMIN.APPOINTMENTS    → GET  /api/v1/admin/appointments/
  ADMIN.HEALTH          → GET  /api/v1/admin/health/
"""

from django.urls import path
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.views import AdminDashboardView
from audit.views import AuditLogListView
from audit.models import AuditLog
from hospital.views import HospitalViewSet
from apps.doctors.views import DoctorProfileViewSet
from apps.patients.views import PatientProfileViewSet
from appointments.views import AppointmentViewSet
from health.views import HealthView as _HealthView  # ✅ FIX WARNING-02: real health check
# F-08 FIX: Use StandardPagination from core for consistent response envelope + page_size
from core.pagination import StandardPagination

app_name = "admin_api"


class AdminHospitalToggleView(APIView):
    """POST /api/v1/admin/hospitals/{id}/toggle/ — activate/deactivate a hospital."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from hospital.models import Hospital
        try:
            hospital = Hospital.objects.get(pk=pk)
            hospital.is_active = not hospital.is_active
            hospital.save(update_fields=["is_active"])
            return Response({
                "id": hospital.pk,
                "is_active": hospital.is_active,
                "message": f"Hospital {'activated' if hospital.is_active else 'deactivated'} successfully.",
            })
        except Hospital.DoesNotExist:
            from rest_framework import status
            return Response({"detail": "Hospital not found."}, status=status.HTTP_404_NOT_FOUND)


class AdminDoctorToggleView(APIView):
    """POST /api/v1/admin/doctors/{id}/toggle/ — activate/deactivate a doctor."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from apps.doctors.models import DoctorProfile
        try:
            profile = DoctorProfile.objects.select_related("user").get(pk=pk)
            profile.user.is_active = not profile.user.is_active
            profile.user.save(update_fields=["is_active"])
            # ISSUE-006+014: Log toggle action to audit trail
            try:
                AuditLog.log(
                    action=AuditLog.Action.TOGGLE, actor=request.user, obj=profile.user,
                    ip_address=request.META.get("REMOTE_ADDR"),
                    new_data={"is_active": profile.user.is_active},
                )
            except Exception:
                pass
            return Response({
                "id": profile.pk,
                "is_active": profile.user.is_active,
                "message": f"Doctor {'activated' if profile.user.is_active else 'deactivated'} successfully.",
            })
        except DoctorProfile.DoesNotExist:
            from rest_framework import status
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)


class AdminPatientToggleView(APIView):
    """POST /api/v1/admin/patients/{id}/toggle/ — activate/deactivate a patient."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from apps.patients.models import PatientProfile
        try:
            profile = PatientProfile.objects.select_related("user").get(pk=pk)
            profile.user.is_active = not profile.user.is_active
            profile.user.save(update_fields=["is_active"])
            # ISSUE-006+014: Log toggle action to audit trail
            try:
                AuditLog.log(
                    action=AuditLog.Action.TOGGLE, actor=request.user, obj=profile.user,
                    ip_address=request.META.get("REMOTE_ADDR"),
                    new_data={"is_active": profile.user.is_active},
                )
            except Exception:
                pass
            return Response({
                "id": profile.pk,
                "is_active": profile.user.is_active,
                "message": f"Patient {'activated' if profile.user.is_active else 'deactivated'} successfully.",
            })
        except PatientProfile.DoesNotExist:
            return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)


class AdminAssistantToggleView(APIView):
    """POST /api/v1/admin/assistants/{id}/toggle/ — activate/deactivate an assistant (by user ID)."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from apps.accounts.models import User
        try:
            user = User.objects.get(pk=pk, is_assistant=True)
            user.is_active = not user.is_active
            user.save(update_fields=["is_active"])
            return Response({
                "id": user.pk,
                "is_active": user.is_active,
                "message": f"Assistant {'activated' if user.is_active else 'deactivated'} successfully.",
            })
        except User.DoesNotExist:
            return Response({"detail": "Assistant not found."}, status=status.HTTP_404_NOT_FOUND)


class AdminPatientListView(APIView):
    """GET /api/v1/admin/patients/ — paginated list of all patients."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.patients.models import PatientProfile
        from apps.patients.serializers import PatientProfileSerializer
        # F-08 FIX: Use StandardPagination (page_size=20, consistent envelope)
        pager = StandardPagination()
        qs = PatientProfile.objects.select_related("user").order_by("-created_at")
        page = pager.paginate_queryset(qs, request)
        data = PatientProfileSerializer(page, many=True, context={"request": request}).data
        return pager.get_paginated_response(data)


class AdminAppointmentListView(APIView):
    """GET /api/v1/admin/appointments/ — paginated list of all appointments.

    FIX Issue #6: Added server-side filtering support via query params:
      ?status=  — filter by appointment status
      ?date_from= / ?date_to= — filter by date range
      ?search= — search patient/doctor name
    Also adds hospital_name flat field for frontend table column.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from appointments.models import Appointment

        # F-08 FIX: Use StandardPagination (page_size=20, consistent envelope)
        pager = StandardPagination()
        qs = Appointment.objects.select_related(
            "patient", "doctor", "slot", "clinic", "hospital",
            "patient__patient_profile", "doctor__doctor_profile"
        ).order_by("-created_at")

        # ── Server-side filters (Fix Issue #6) ──────────────────────────────
        status_filter = request.query_params.get("status", "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)

        date_from = request.query_params.get("date_from", "").strip()
        date_to   = request.query_params.get("date_to",   "").strip()
        if date_from or date_to:
            from django.db.models import Q
            from datetime import date as dt_date
            try:
                if date_from:
                    qs = qs.filter(slot__start__date__gte=date_from)
                if date_to:
                    qs = qs.filter(slot__start__date__lte=date_to)
            except Exception:
                pass

        search = request.query_params.get("search", "").strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(patient__full_name__icontains=search) |
                Q(doctor__full_name__icontains=search)
            )

        page = pager.paginate_queryset(qs, request)

        # Build flat response shape the frontend expects (patient_name, doctor_name, hospital_name, date, status)
        data = []
        for appt in page:
            hospital_name = ""
            try:
                if appt.hospital:
                    hospital_name = appt.hospital.name
                elif appt.clinic:
                    hospital_name = appt.clinic.name
            except Exception:
                pass

            appt_date = None
            try:
                if appt.slot and appt.slot.start:
                    appt_date = appt.slot.start.isoformat()
            except Exception:
                pass

            data.append({
                "id":            appt.id,
                "public_id":     str(appt.public_id) if hasattr(appt, "public_id") and appt.public_id else None,
                "patient_name":  getattr(appt.patient, "full_name", "") or "",
                "doctor_name":   getattr(appt.doctor,  "full_name", "") or "",
                "hospital_name": hospital_name,
                "date":          appt_date,
                "status":        appt.status or "",
                "visit_type":    getattr(appt, "visit_type", "") or "",
                "created_at":    appt.created_at.isoformat() if getattr(appt, "created_at", None) else None,
            })

        return pager.get_paginated_response(data)


class AdminHospitalListView(APIView):
    """GET /api/v1/admin/hospitals/ — paginated hospital list for admin."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from hospital.models import Hospital
        from hospital.serializers import HospitalSerializer

        # F-08 FIX: Use StandardPagination (page_size=20, consistent envelope)
        pager = StandardPagination()
        qs = Hospital.objects.order_by("name")
        page = pager.paginate_queryset(qs, request)
        data = HospitalSerializer(page, many=True, context={"request": request}).data
        return pager.get_paginated_response(data)


class AdminDoctorListView(APIView):
    """GET /api/v1/admin/doctors/ — paginated doctor list for admin.

    FIX Issue #5: Returns flat fields matching frontend DoctorsSection field mapping:
      name, specialty, hospital_name, rating, is_active, image, date_joined
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.doctors.models import DoctorProfile

        # F-08 FIX: Use StandardPagination (page_size=20, consistent envelope)
        pager = StandardPagination()
        qs = DoctorProfile.objects.select_related("user").prefetch_related(
            "user__hospital_doctor_links__hospital",
            "clinics_owned",
        ).order_by("-user__date_joined")

        # Support optional ?search= query param
        search = request.query_params.get("search", "").strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(user__full_name__icontains=search) |
                Q(specialty__icontains=search)
            )

        page = pager.paginate_queryset(qs, request)

        # Build flat response shape the frontend expects
        data = []
        for profile in page:
            u = profile.user
            hospital_name = ""
            clinic_name = ""
            workplace_name = ""
            workplace_type = ""
            try:
                assignment = u.hospital_doctor_links.filter(is_active=True).first()
                if assignment and assignment.hospital:
                    hospital_name = assignment.hospital.name
                    workplace_name = hospital_name
                    workplace_type = "hospital"
            except Exception:
                pass

            try:
                clinic = profile.clinics_owned.filter(is_active=True).first()
                if not clinic:
                    clinic = profile.clinics_owned.first()
                if clinic:
                    clinic_name = clinic.name
                    if not workplace_name:
                        workplace_name = clinic_name
                        workplace_type = "private_clinic"
            except Exception:
                pass

            # Try to get profile image
            image = None
            try:
                image = request.build_absolute_uri(profile.profile_image.url) if profile.profile_image else None
            except Exception:
                pass

            data.append({
                "id":           profile.pk,
                "user_id":      u.id,
                "name":         u.full_name or u.username,
                "image":        image,
                "specialty":    getattr(profile, "specialty", "") or "",
                "hospital_name": hospital_name,
                "clinic_name":  clinic_name,
                "workplace_name": workplace_name,
                "workplace_type": workplace_type,
                "rating":       float(profile.rating) if getattr(profile, "rating", None) else None,
                "is_active":    u.is_active,
                "date_joined":  u.date_joined.isoformat(),
                "last_login":   u.last_login.isoformat() if u.last_login else None,
                "email":        u.email,
                "phone":        u.phone or "",
            })

        return pager.get_paginated_response(data)


class AdminUserDeleteView(APIView):
    """
    DELETE /api/v1/admin/users/{id}/ — deactivate a user (soft delete)
    PATCH  /api/v1/admin/users/{id}/ — toggle is_active (activate or deactivate)
    FIX: frontend AdminUsersPage sends PATCH { is_active } to toggle in both directions
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, pk):
        from apps.accounts.models import User
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(User, pk=pk)
        is_active = request.data.get('is_active')
        if is_active is None:
            return Response({"detail": "is_active field is required."}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = bool(is_active)
        user.save(update_fields=['is_active'])
        action = "activated" if user.is_active else "deactivated"
        return Response({"detail": f"User {action}.", "is_active": user.is_active})

    def delete(self, request, pk):
        from apps.accounts.models import User
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(User, pk=pk)
        # Soft delete — deactivate rather than hard delete
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response({"detail": "User deactivated."}, status=status.HTTP_204_NO_CONTENT)



# ─────────────────────────────────────────────────────────────────────────────
# Gap #1: PlatformSettings — GET/PATCH /api/v1/admin/settings/
# ─────────────────────────────────────────────────────────────────────────────
class AdminPlatformSettingsView(APIView):
    """
    GET  /api/v1/admin/settings/ — return current platform settings
    PATCH /api/v1/admin/settings/ — update platform settings (partial)
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from analytics.models import PlatformSettings
        obj = PlatformSettings.get_settings()
        return Response({
            'platform_name':         obj.platform_name,
            'language':              obj.language,
            'timezone':              obj.timezone,
            'currency':              obj.currency,
            'cancel_window':         str(obj.cancel_window),
            'max_reschedule':        str(obj.max_reschedule),
            'slot_duration':         str(obj.slot_duration),
            'maintenance_mode':      obj.maintenance_mode,
            'notify_new_booking':    obj.notify_new_booking,
            'notify_cancellation':   obj.notify_cancellation,
            'notify_new_user':       obj.notify_new_user,
            'notify_system_alerts':  obj.notify_system_alerts,
            'notify_low_rating':     obj.notify_low_rating,
            'notify_daily_summary':  obj.notify_daily_summary,
            'theme':                 obj.theme,
            'font_size':             obj.font_size,
            'sidebar_style':         obj.sidebar_style,
            'updated_at':            obj.updated_at.isoformat() if obj.updated_at else None,
        })

    def patch(self, request):
        from analytics.models import PlatformSettings
        obj = PlatformSettings.get_settings()
        int_fields  = {'cancel_window', 'max_reschedule', 'slot_duration'}
        bool_fields = {
            'maintenance_mode', 'notify_new_booking', 'notify_cancellation',
            'notify_new_user', 'notify_system_alerts', 'notify_low_rating', 'notify_daily_summary',
        }
        allowed = {
            'platform_name', 'language', 'timezone', 'currency',
            'theme', 'font_size', 'sidebar_style',
        } | int_fields | bool_fields

        updated = []
        for key, val in request.data.items():
            if key not in allowed:
                continue
            if key in int_fields:
                try:
                    val = int(val)
                except (ValueError, TypeError):
                    continue
            if key in bool_fields:
                if isinstance(val, str):
                    val = val.lower() in ('true', '1', 'yes')
                else:
                    val = bool(val)
            setattr(obj, key, val)
            updated.append(key)

        if updated:
            # ISSUE-019 FIX: auto_now=True fields must NOT be in update_fields.
            # Use plain save() so updated_at gets auto-set by Django.
            obj.save()

        return Response({
            'detail': 'Settings updated successfully.',
            'updated_fields': updated,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Gap #2: Time-Series endpoint — GET /api/v1/admin/analytics/time-series/
# ─────────────────────────────────────────────────────────────────────────────
class AdminTimeSeriesView(APIView):
    """
    GET /api/v1/admin/analytics/time-series/?days=30
    Returns daily appointment + new-patient counts for the last N days.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from analytics.selectors import get_admin_time_series
        try:
            days = int(request.query_params.get('days', 30))
            days = max(7, min(days, 365))
        except (ValueError, TypeError):
            days = 30
        data = get_admin_time_series(days=days)
        return Response({'days': days, 'series': data})



# ─────────────────────────────────────────────────────────────────────────────
# NEW: AdminAllUsersListView — GET /api/v1/admin/users/
# Fix NEW#1: UsersSection was fetching /admin/patients/ only.
# This endpoint returns all users (doctors + patients + assistants + admins)
# with optional ?role= filter.
# ─────────────────────────────────────────────────────────────────────────────
class AdminAllUsersListView(APIView):
    """GET /api/v1/admin/users/ — paginated list of ALL users, optionally filtered by role."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.accounts.models import User
        qs = User.objects.filter(is_deleted=False).order_by('-date_joined')
        role = request.query_params.get('role')
        if role == 'doctor':
            qs = qs.filter(is_doctor=True)
        elif role == 'patient':
            qs = qs.filter(is_patient=True)
        elif role == 'assistant':
            qs = qs.filter(is_assistant=True)
        elif role == 'admin':
            qs = qs.filter(is_platform_admin=True)

        search = request.query_params.get('search', '').strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search)
            )

        pager = StandardPagination()
        page = pager.paginate_queryset(qs, request)
        data = [{
            'id':          u.id,
            'full_name':   u.full_name or u.username,
            'email':       u.email,
            'phone':       u.phone or '',
            'role':        u.current_role,
            'is_active':   u.is_active,
            'date_joined': u.date_joined.isoformat(),
            'last_login':  u.last_login.isoformat() if u.last_login else None,
        } for u in page]
        return pager.get_paginated_response(data)


# ─────────────────────────────────────────────────────────────────────────────
# NEW: AdminAssistantListView — GET /api/v1/admin/assistants/
# Fix NEW#2 / Gap#3A: AssistantsSection was always showing empty table because
# neither /admin/assistants/ nor /admin/users/?role=assistant existed.
# ─────────────────────────────────────────────────────────────────────────────
class AdminAssistantListView(APIView):
    """GET /api/v1/admin/assistants/ — paginated list of all assistants."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.accounts.models import User
        qs = User.objects.filter(is_assistant=True, is_deleted=False).order_by('-date_joined')

        search = request.query_params.get('search', '').strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search)
            )

        pager = StandardPagination()
        page = pager.paginate_queryset(qs, request)
        data = []
        for u in page:
            hospital_name = ''
            clinic_name = ''
            try:
                ap = getattr(u, 'assistant_profile', None)
                if ap:
                    hosp_assignment = ap.hospital_assignments.select_related('hospital').filter(is_active=True).first()
                    if hosp_assignment and hosp_assignment.hospital:
                        hospital_name = hosp_assignment.hospital.name
                    clinic_assignment = ap.clinic_assignments.select_related('clinic').filter(is_active=True).first()
                    if clinic_assignment and clinic_assignment.clinic:
                        clinic_name = clinic_assignment.clinic.name
            except Exception:
                pass
            data.append({
                'id':            u.id,
                'full_name':     u.full_name or u.username,
                'email':         u.email,
                'phone':         u.phone or '',
                'is_active':     u.is_active,
                'date_joined':   u.date_joined.isoformat(),
                'hospital_name': hospital_name,
                'clinic_name':   clinic_name,
            })
        return pager.get_paginated_response(data)


# ─────────────────────────────────────────────────────────────────────────────
# NEW: Profile Detail Endpoints — Gap #3B
# GET /api/v1/admin/doctors/{id}/
# GET /api/v1/admin/patients/{id}/
# GET /api/v1/admin/hospitals/{id}/
# GET /api/v1/admin/assistants/{id}/
# ─────────────────────────────────────────────────────────────────────────────
class AdminDoctorDetailView(APIView):
    """GET /api/v1/admin/doctors/{id}/ — full profile for a single doctor."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        from apps.doctors.models import DoctorProfile
        try:
            profile = DoctorProfile.objects.select_related('user', 'hospital').get(pk=pk)
        except DoctorProfile.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        u = profile.user
        data = {
            'id':              profile.pk,
            'user_id':         u.id,
            'full_name':       u.full_name or u.username,
            'email':           u.email,
            'phone':           u.phone or '',
            'is_active':       u.is_active,
            'date_joined':     u.date_joined.isoformat(),
            'last_login':      u.last_login.isoformat() if u.last_login else None,
            'specialization':  getattr(profile, 'specialization', ''),
            'hospital_name':   profile.hospital.name if getattr(profile, 'hospital', None) else '',
            'experience_years':getattr(profile, 'experience_years', None),
            'bio':             getattr(profile, 'bio', ''),
            'rating':          float(profile.rating) if getattr(profile, 'rating', None) else None,
            'total_patients':  getattr(profile, 'total_patients', 0),
        }
        return Response(data)


class AdminPatientDetailView(APIView):
    """GET /api/v1/admin/patients/{id}/ — full profile for a single patient."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        from apps.patients.models import PatientProfile
        try:
            profile = PatientProfile.objects.select_related('user').get(pk=pk)
        except PatientProfile.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        u = profile.user
        data = {
            'id':           profile.pk,
            'user_id':      u.id,
            'full_name':    u.full_name or u.username,
            'email':        u.email,
            'phone':        u.phone or '',
            'is_active':    u.is_active,
            'date_joined':  u.date_joined.isoformat(),
            'last_login':   u.last_login.isoformat() if u.last_login else None,
            'birth_date':   profile.birth_date.isoformat() if getattr(profile, 'birth_date', None) else None,
            'gender':       getattr(profile, 'gender', ''),
            'blood_type':   getattr(profile, 'blood_type', ''),
            'address':      getattr(profile, 'address', '') or getattr(u, 'city', '') or '',
        }
        return Response(data)


class AdminHospitalDetailView(APIView):
    """GET /api/v1/admin/hospitals/{id}/ — full profile for a single hospital."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        from hospital.models import Hospital
        try:
            hospital = Hospital.objects.get(pk=pk)
        except Hospital.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        data = {
            'id':           hospital.pk,
            'name':         hospital.name,
            'is_active':    hospital.is_active,
            'city':         getattr(hospital, 'city', '') or '',
            'address':      getattr(hospital, 'address', '') or '',
            'phone':        getattr(hospital, 'phone', '') or '',
            'email':        getattr(hospital, 'email', '') or '',
            'website':      getattr(hospital, 'website', '') or '',
            'description':  getattr(hospital, 'description', '') or '',
            'created_at':   hospital.created_at.isoformat() if getattr(hospital, 'created_at', None) else None,
            'doctors_count':getattr(hospital, 'doctors_count', None),
        }
        return Response(data)


class AdminAssistantDetailView(APIView):
    """GET /api/v1/admin/assistants/{id}/ — full profile for a single assistant."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        from apps.accounts.models import User
        try:
            u = User.objects.get(pk=pk, is_assistant=True)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        hospital_name = ''
        try:
            if hasattr(u, 'doctor_profile') and u.doctor_profile:
                dp = u.doctor_profile
                if hasattr(dp, 'hospital') and dp.hospital:
                    hospital_name = dp.hospital.name
        except Exception:
            pass
        data = {
            'id':            u.id,
            'full_name':     u.full_name or u.username,
            'email':         u.email,
            'phone':         u.phone or '',
            'is_active':     u.is_active,
            'date_joined':   u.date_joined.isoformat(),
            'last_login':    u.last_login.isoformat() if u.last_login else None,
            'hospital_name': hospital_name,
            'clinic_name':   '',
        }
        return Response(data)


urlpatterns = [
    # GET /api/v1/admin/stats/
    path("stats/",                    AdminDashboardView.as_view(),           name="admin-stats"),
    # GET /api/v1/admin/health/
    path("health/",                   _HealthView.as_view(),                  name="admin-health"),
    # GET /api/v1/admin/audit-logs/
    path("audit-logs/",               AuditLogListView.as_view(),             name="admin-audit-logs"),
    # GET /api/v1/admin/hospitals/
    path("hospitals/",                AdminHospitalListView.as_view(),        name="admin-hospitals"),
    # GET /api/v1/admin/hospitals/{id}/  — Profile detail (Gap #3B)
    path("hospitals/<int:pk>/",       AdminHospitalDetailView.as_view(),      name="admin-hospital-detail"),
    # POST /api/v1/admin/hospitals/{id}/toggle/
    path("hospitals/<int:pk>/toggle/", AdminHospitalToggleView.as_view(),     name="admin-hospital-toggle"),
    # GET /api/v1/admin/doctors/
    path("doctors/",                  AdminDoctorListView.as_view(),          name="admin-doctors"),
    # GET /api/v1/admin/doctors/{id}/   — Profile detail (Gap #3B)
    path("doctors/<int:pk>/",         AdminDoctorDetailView.as_view(),        name="admin-doctor-detail"),
    # POST /api/v1/admin/doctors/{id}/toggle/
    path("doctors/<int:pk>/toggle/",  AdminDoctorToggleView.as_view(),        name="admin-doctor-toggle"),
    # GET /api/v1/admin/patients/
    path("patients/",                 AdminPatientListView.as_view(),         name="admin-patients"),
    # GET /api/v1/admin/patients/{id}/  — Profile detail (Gap #3B)
    path("patients/<int:pk>/",        AdminPatientDetailView.as_view(),       name="admin-patient-detail"),
    # POST /api/v1/admin/patients/{id}/toggle/
    path("patients/<int:pk>/toggle/",  AdminPatientToggleView.as_view(),      name="admin-patient-toggle"),
    # GET /api/v1/admin/appointments/
    path("appointments/",             AdminAppointmentListView.as_view(),     name="admin-appointments"),
    # GET  /api/v1/admin/users/         — All users combined (Fix NEW#1)
    path("users/",                    AdminAllUsersListView.as_view(),        name="admin-all-users"),
    # DELETE/PATCH /api/v1/admin/users/{id}/
    path("users/<int:pk>/",           AdminUserDeleteView.as_view(),          name="admin-user-delete"),
    # GET /api/v1/admin/assistants/     — Fix NEW#2 / Gap#3A
    path("assistants/",               AdminAssistantListView.as_view(),       name="admin-assistants"),
    # GET /api/v1/admin/assistants/{id}/ — Profile detail (Gap #3B)
    path("assistants/<int:pk>/",      AdminAssistantDetailView.as_view(),     name="admin-assistant-detail"),
    # POST /api/v1/admin/assistants/{id}/toggle/
    path("assistants/<int:pk>/toggle/", AdminAssistantToggleView.as_view(),   name="admin-assistant-toggle"),
    # ── Gap #1: Settings ─────────────────────────────────────────────────────
    # GET/PATCH /api/v1/admin/settings/
    path("settings/",                 AdminPlatformSettingsView.as_view(),    name="admin-settings"),
    # ── Gap #2: Time-Series ───────────────────────────────────────────────────
    # GET /api/v1/admin/analytics/time-series/?days=30
    path("analytics/time-series/",    AdminTimeSeriesView.as_view(),          name="admin-time-series"),
]
