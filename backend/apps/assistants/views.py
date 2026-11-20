"""
CuraBook — Assistants Views
============================
Assistant profile + workplace management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from core.pagination import StandardPagination
from core.response import SuccessResponse, ErrorResponse
from .models import AssistantProfile, AssistantShift
from .serializers import AssistantProfileSerializer, AssistantShiftSerializer
from .selectors import get_assistant_profile, get_assistant_workplaces
from .permissions import IsAssistantOwner


class AssistantProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/v1/assistants/"""
    serializer_class   = AssistantProfileSerializer
    permission_classes = [IsAuthenticated, IsAssistantOwner]
    pagination_class   = StandardPagination

    def get_queryset(self):
        user = self.request.user
        qs = AssistantProfile.objects.select_related("user").filter(
            user__is_active=True, user__is_deleted=False
        )
        if user.is_staff or getattr(user, "is_platform_admin", False):
            return qs
        return qs.filter(user=user)

    @action(detail=False, methods=["get"], url_path="my-workplaces")
    def my_workplaces(self, request):
        """GET /api/v1/assistants/my-workplaces/"""
        profile = get_assistant_profile(request.user)
        if not profile:
            return ErrorResponse(
                code="NOT_FOUND",
                message="Assistant profile not found.",
                status=status.HTTP_404_NOT_FOUND,
            )
        data = get_assistant_workplaces(profile)
        return SuccessResponse(data=data)

    @action(detail=False, methods=["get"], url_path="my-appointments")
    def my_appointments(self, request):
        """
        GET /api/v1/assistants/my-appointments/
        Returns appointments from ALL clinics AND hospitals the assistant manages.
        Supports: ?status=PENDING|CONFIRMED|COMPLETED|CANCELLED
                  ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
                  ?clinic_id=X&hospital_id=Y
        """
        from appointments.selectors import get_appointments_for_assistant
        from apps.assistants.serializers import AssistantAppointmentListSerializer

        profile = get_assistant_profile(request.user)
        if not profile:
            return ErrorResponse(
                code="NOT_FOUND",
                message="Assistant profile not found.",
                status=status.HTTP_404_NOT_FOUND,
            )

        qs = get_appointments_for_assistant(profile)

        # Optional filters
        appt_status = request.query_params.get("status")
        if appt_status:
            qs = qs.filter(status=appt_status.upper())

        date_from = request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(slot__start__date__gte=date_from)

        date_to = request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(slot__start__date__lte=date_to)

        clinic_id = request.query_params.get("clinic_id")
        if clinic_id:
            qs = qs.filter(clinic_id=clinic_id)

        hospital_id = request.query_params.get("hospital_id")
        if hospital_id:
            qs = qs.filter(hospital_id=hospital_id)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AssistantAppointmentListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


# ─────────────────────────────────────────────────────────────
# Dedicated endpoint matching the frontend's expected contract:
#   GET /api/v1/assistant/appointments
# (note: singular "assistant" — frontend may call this directly)
# ─────────────────────────────────────────────────────────────

class AssistantUnifiedAppointmentsView(APIView):
    """
    GET /api/v1/assistant/appointments/

    Unified appointments list for the assistant — combines ALL clinics
    and ALL hospitals they're assigned to in a single response.

    Query params:
      ?status=PENDING|CONFIRMED|COMPLETED|CANCELLED
      ?date_from=YYYY-MM-DD
      ?date_to=YYYY-MM-DD
      ?clinic_id=X
      ?hospital_id=Y
      ?page=N&page_size=N
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, "is_assistant", False):
            return ErrorResponse(
                code="FORBIDDEN",
                message="This endpoint is for assistants only.",
                status=status.HTTP_403_FORBIDDEN,
            )

        from appointments.selectors import get_appointments_for_assistant
        from apps.assistants.serializers import AssistantAppointmentListSerializer

        profile = get_assistant_profile(request.user)
        if not profile:
            return ErrorResponse(
                code="NOT_FOUND",
                message="Assistant profile not found.",
                status=status.HTTP_404_NOT_FOUND,
            )

        qs = get_appointments_for_assistant(profile)

        # Filters
        appt_status = request.query_params.get("status")
        if appt_status:
            qs = qs.filter(status=appt_status.upper())

        date_from = request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(slot__start__date__gte=date_from)

        date_to = request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(slot__start__date__lte=date_to)

        clinic_id = request.query_params.get("clinic_id")
        if clinic_id:
            qs = qs.filter(clinic_id=clinic_id)

        hospital_id = request.query_params.get("hospital_id")
        if hospital_id:
            qs = qs.filter(hospital_id=hospital_id)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AssistantAppointmentListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class AssistantScheduleView(APIView):
    """
    GET /api/v1/assistant/schedule/
    Returns the assistant's working schedule (days & hours).
    Data comes from the clinics and hospitals they're assigned to.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, "is_assistant", False):
            return ErrorResponse(
                code="FORBIDDEN",
                message="Only assistants can access this endpoint.",
                status=status.HTTP_403_FORBIDDEN,
            )

        profile = get_assistant_profile(request.user)
        if not profile:
            return ErrorResponse(
                code="NOT_FOUND",
                message="Assistant profile not found.",
                status=status.HTTP_404_NOT_FOUND,
            )

        schedule_data = []
        wp_dict = get_assistant_workplaces(profile)
        all_workplaces = (
            [{'type': 'clinic',   **c} for c in wp_dict.get('clinics',   [])] +
            [{'type': 'hospital', **h} for h in wp_dict.get('hospitals', [])]
        )

        for wp in all_workplaces:
            wp_id   = wp.get("id")
            wp_name = wp.get("name") or wp.get("clinic_name") or wp.get("hospital_name") or f"Workplace #{wp_id}"
            wp_type = wp.get("type", "clinic")

            # C-03 FIX: Only include REAL working hours — never generate fake placeholder data.
            hours = wp.get("working_hours") or wp.get("hours") or []
            if isinstance(hours, list) and hours:
                for h in hours:
                    schedule_data.append({
                        "day_name":       h.get("day", ""),
                        "start_time":     h.get("start_time", ""),
                        "end_time":       h.get("end_time", ""),
                        "workplace_name": wp_name,
                        "workplace_type": wp_type,
                    })
            # If no hours configured for this workplace, skip it — do NOT add M-F 09:00-17:00 fake data.

        response_data = {
            "schedule": schedule_data,
            "total": len(schedule_data),
        }
        if not schedule_data:
            response_data["message"] = "No schedule assigned yet. Please contact your clinic or hospital admin."

        return SuccessResponse(data=response_data)


class AssistantShiftView(APIView):
    """
    CRUD for assistant personal shifts.
    GET    /api/v1/assistant/shifts/          — list (with date_from/date_to/page/page_size filters)
    POST   /api/v1/assistant/shifts/          — create
    PATCH  /api/v1/assistant/shifts/{id}/     — update
    DELETE /api/v1/assistant/shifts/{id}/     — delete
    """
    permission_classes = [IsAuthenticated]

    def _get_profile_or_error(self, request):
        if not getattr(request.user, 'is_assistant', False):
            return None, ErrorResponse(
                code='FORBIDDEN',
                message='Only assistants can access this endpoint.',
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = get_assistant_profile(request.user)
        if not profile:
            return None, ErrorResponse(
                code='NOT_FOUND',
                message='Assistant profile not found.',
                status=status.HTTP_404_NOT_FOUND,
            )
        return profile, None

    def get(self, request):
        profile, err = self._get_profile_or_error(request)
        if err:
            return err

        qs = AssistantShift.objects.filter(assistant=profile)

        date_from = request.query_params.get('date_from')
        date_to   = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        # Pagination
        page      = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        total     = qs.count()
        shifts    = qs[(page - 1) * page_size: page * page_size]

        serializer = AssistantShiftSerializer(shifts, many=True)
        return SuccessResponse(data={
            'results':   serializer.data,
            'count':     total,
            'page':      page,
            'page_size': page_size,
        })

    def post(self, request):
        profile, err = self._get_profile_or_error(request)
        if err:
            return err

        serializer = AssistantShiftSerializer(data=request.data)
        if not serializer.is_valid():
            return ErrorResponse(
                code='VALIDATION_ERROR',
                message='Invalid shift data.',
                details=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save(assistant=profile)
        return SuccessResponse(data=serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, shift_id=None):
        profile, err = self._get_profile_or_error(request)
        if err:
            return err

        try:
            shift = AssistantShift.objects.get(pk=shift_id, assistant=profile)
        except AssistantShift.DoesNotExist:
            return ErrorResponse(
                code='NOT_FOUND',
                message='Shift not found.',
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AssistantShiftSerializer(shift, data=request.data, partial=True)
        if not serializer.is_valid():
            return ErrorResponse(
                code='VALIDATION_ERROR',
                message='Invalid shift data.',
                details=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save()
        return SuccessResponse(data=serializer.data)

    def delete(self, request, shift_id=None):
        profile, err = self._get_profile_or_error(request)
        if err:
            return err

        try:
            shift = AssistantShift.objects.get(pk=shift_id, assistant=profile)
        except AssistantShift.DoesNotExist:
            return ErrorResponse(
                code='NOT_FOUND',
                message='Shift not found.',
                status=status.HTTP_404_NOT_FOUND,
            )
        shift.delete()
        return SuccessResponse(data={'deleted': True})


class AssistantMeView(APIView):
    """
    GET /api/v1/assistant/me/
    Returns the current assistant's profile including permissions.
    Used by AssistantSettingsPage to display real permission values.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, 'is_assistant', False):
            return ErrorResponse(
                code='FORBIDDEN',
                message='This endpoint is for assistants only.',
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = get_assistant_profile(request.user)
        if not profile:
            return ErrorResponse(
                code='NOT_FOUND',
                message='Assistant profile not found.',
                status=status.HTTP_404_NOT_FOUND,
            )
        return SuccessResponse(data={
            'id': profile.id,
            'can_manage_appointments': profile.can_manage_appointments,
            'can_upload_documents':    profile.can_upload_documents,
            'can_edit_schedule':       profile.can_edit_schedule,
            'permissions':             profile.effective_permissions(),
            'updated_at': profile.updated_at.isoformat() if hasattr(profile, 'updated_at') and profile.updated_at else None,
        })


class AssistantDoctorsView(APIView):
    """
    GET /api/v1/assistant/doctors/
    Returns doctors linked to the assistant's workplaces (clinics + hospitals).
    Used by the frontend's "Add Shift" modal for the doctor autocomplete field.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, 'is_assistant', False):
            return ErrorResponse(
                code='FORBIDDEN',
                message='This endpoint is for assistants only.',
                status=status.HTTP_403_FORBIDDEN,
            )

        profile = get_assistant_profile(request.user)
        if not profile:
            return ErrorResponse(
                code='NOT_FOUND',
                message='Assistant profile not found.',
                status=status.HTTP_404_NOT_FOUND,
            )

        # Collect doctors from the assistant's workplaces
        doctors = []
        seen_ids = set()

        # From clinics
        try:
            from clinics.models import ClinicAssistant
            clinic_assignments = ClinicAssistant.objects.filter(
                assistant=profile
            ).select_related('clinic')
            for ca in clinic_assignments:
                clinic = ca.clinic
                try:
                    from apps.doctors.models import DoctorProfile
                    clinic_doctors = DoctorProfile.objects.filter(
                        clinic_affiliations__clinic=clinic
                    ).select_related('user')
                    for dp in clinic_doctors:
                        if dp.id not in seen_ids:
                            seen_ids.add(dp.id)
                            doctors.append({
                                'id': dp.id,
                                'user_id': dp.user_id,
                                'full_name': (
                                    getattr(dp, 'full_name', None) or
                                    f"{dp.user.first_name} {dp.user.last_name}".strip() or
                                    dp.user.username
                                ),
                                'specialty': getattr(dp, 'specialty', '') or '',
                                'workplace': getattr(clinic, 'name', '') or '',
                                'workplace_id': clinic.id,
                                'workplace_type': 'clinic',
                            })
                except Exception:
                    pass
        except Exception:
            pass

        # From hospitals
        try:
            from hospital.models import HospitalAssistant
            hospital_assignments = HospitalAssistant.objects.filter(
                assistant=profile
            ).select_related('hospital')
            for ha in hospital_assignments:
                hospital = ha.hospital
                try:
                    from apps.doctors.models import DoctorProfile
                    hosp_doctors = DoctorProfile.objects.filter(
                        hospital_affiliations__hospital=hospital
                    ).select_related('user')
                    for dp in hosp_doctors:
                        if dp.id not in seen_ids:
                            seen_ids.add(dp.id)
                            doctors.append({
                                'id': dp.id,
                                'user_id': dp.user_id,
                                'full_name': (
                                    getattr(dp, 'full_name', None) or
                                    f"{dp.user.first_name} {dp.user.last_name}".strip() or
                                    dp.user.username
                                ),
                                'specialty': getattr(dp, 'specialty', '') or '',
                                'workplace': getattr(hospital, 'name', '') or '',
                                'workplace_id': hospital.id,
                                'workplace_type': 'hospital',
                            })
                except Exception:
                    pass
        except Exception:
            pass

        return SuccessResponse(data={
            'count': len(doctors),
            'results': doctors,
        })


class AssistantPatientsView(APIView):
    """
    HIGH-04 FIX: GET /api/v1/assistant/patients/

    Returns unique patients derived from the assistant's appointments.
    Supports ?search=name for server-side filtering.

    Response:
      { count: int, results: [{ id, patient_name, phone, email, appointments_count,
                                last_appointment_date, last_appointment_status }] }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, "is_assistant", False):
            return ErrorResponse(
                code="FORBIDDEN",
                message="This endpoint is for assistants only.",
                status=status.HTTP_403_FORBIDDEN,
            )

        from appointments.selectors import get_appointments_for_assistant
        from collections import defaultdict

        profile = get_assistant_profile(request.user)
        if not profile:
            return ErrorResponse(
                code="NOT_FOUND",
                message="Assistant profile not found.",
                status=status.HTTP_404_NOT_FOUND,
            )

        qs = get_appointments_for_assistant(profile)

        # Apply search filter
        search = request.query_params.get("search", "").strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(patient__first_name__icontains=search) |
                Q(patient__last_name__icontains=search)  |
                Q(patient__phone__icontains=search)
            )

        # Build unique patients map
        patients_map = defaultdict(lambda: {
            "id": None,
            "patient_name": "",
            "phone": "",
            "email": "",
            "appointments_count": 0,
            "last_appointment_date": None,
            "last_appointment_status": None,
        })

        for appt in qs.select_related("patient"):
            patient = getattr(appt, "patient", None)
            if patient is None:
                continue
            pid = patient.id
            entry = patients_map[pid]
            if entry["id"] is None:
                entry["id"] = pid
                full_name = getattr(patient, "full_name", None) or (
                    f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip()
                ) or f"مريض #{pid}"
                entry["patient_name"] = full_name
                entry["phone"] = getattr(patient, "phone", "") or getattr(patient, "phone_number", "") or ""
                entry["email"] = getattr(patient, "email", "") or ""

            entry["appointments_count"] += 1

            # Track latest appointment
            appt_date = None
            slot = getattr(appt, "slot", None)
            if slot:
                start = getattr(slot, "start", None)
                if start:
                    appt_date = start.date().isoformat()
            if appt_date and (entry["last_appointment_date"] is None or appt_date > entry["last_appointment_date"]):
                entry["last_appointment_date"] = appt_date
                entry["last_appointment_status"] = getattr(appt, "status", "")

        results = list(patients_map.values())
        # Sort by name
        results.sort(key=lambda p: p["patient_name"])

        return SuccessResponse(data={
            "count": len(results),
            "results": results,
        })


class AssistantSearchView(APIView):
    """
    Bug #6 Fix: GET /api/v1/assistants/search/?q=<query>
    Search registered assistants by name or email.
    Used by AddAssistantToHospitalModal to find existing assistants
    and link them to the hospital (instead of creating duplicates).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Q
        from apps.accounts.models import User

        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return SuccessResponse(data={"count": 0, "results": []})

        users = User.objects.filter(
            is_active=True,
            is_deleted=False,
            is_assistant=True,
        ).filter(
            Q(full_name__icontains=query) |
            Q(email__icontains=query) |
            Q(username__icontains=query)
        ).select_related('assistant_profile')[:20]

        results = []
        for u in users:
            profile = getattr(u, 'assistant_profile', None)
            if not profile:
                continue
            results.append({
                'id': profile.id,
                'user_id': u.id,
                'full_name': u.full_name or u.username,
                'email': u.email,
                'phone': u.phone or '',
                'profile_image': (
                    request.build_absolute_uri(profile.profile_image.url)
                    if profile and getattr(profile, 'profile_image', None) and profile.profile_image
                    else None
                ),
            })

        return SuccessResponse(data={"count": len(results), "results": results})
