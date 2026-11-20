"""
CuraBook — Hospital Admin API URLs (Frontend Contract)
======================================================
Maps /api/v1/hospital/* paths used by frontend apiRoutes.js
to the correct backend views.

Frontend constants (apiRoutes.js):
  HOSPITAL.OVERVIEW      → GET /api/v1/hospital/overview/
  HOSPITAL.ANALYTICS     → GET /api/v1/hospital/analytics/
  HOSPITAL.APPOINTMENTS  → GET /api/v1/hospital/appointments/
  HOSPITAL.DOCTORS       → GET /api/v1/hospital/doctors/
  HOSPITAL.DOCTOR_DETAIL → GET /api/v1/hospital/doctors/{id}/
  HOSPITAL.PATIENTS      → GET /api/v1/hospital/patients/
  HOSPITAL.ASSISTANTS    → GET /api/v1/hospital/assistants/
"""

from django.urls import path
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

from analytics.views import HospitalDashboardView, HospitalAnalyticsView
from core.permissions import IsHospitalAdmin
from core.pagination import StandardPagination          # FIX B-03/F-08: consistent paginator
from hospital.selectors import get_hospitals_for_admin  # FIX BUG-01

app_name = "hospital_api"


class HospitalAppointmentListView(APIView):
    """GET /api/v1/hospital/appointments/ — all appointments in admin's hospital(s)."""
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def get(self, request):
        from hospital.models import Hospital
        from appointments.models import Appointment
        from appointments.serializers import AppointmentListSerializer
        # FIX B-03/F-08: StandardPagination imported at module level (consistent envelope)

        # Get hospitals managed by this admin
        hospitals = get_hospitals_for_admin(request.user)  # FIX BUG-01: Hospital has no direct admin field
        qs = Appointment.objects.filter(
            hospital__in=hospitals
        ).select_related(
            "patient", "doctor", "doctor__doctor_profile", "slot", "hospital"
        ).order_by("-created_at")

        pager = StandardPagination()  # FIX B-03/F-08: was raw PageNumberPagination() — inconsistent page_size + envelope
        pager.page_size = 20
        page = pager.paginate_queryset(qs, request)
        data = AppointmentListSerializer(page, many=True, context={"request": request}).data
        return pager.get_paginated_response(data)


class HospitalDoctorListView(APIView):
    """
    GET  /api/v1/hospital/doctors/ — doctors in admin's hospital(s).
    POST /api/v1/hospital/doctors/ — link an existing doctor to this hospital.

    BUG FIX: HospitalDoctorSignup.jsx calls POST /hospital/doctors/ with { email }
    after registering a new doctor. Previously only GET existed — caused 405.
    Body: { "email": "doctor@example.com", "department_id": 1 (optional) }
    """
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def _get_hospital(self, user):
        return get_hospitals_for_admin(user).first()

    def post(self, request):
        from hospital.models import HospitalDoctor
        from django.contrib.auth import get_user_model
        from rest_framework import status as drf_status
        from django.db import transaction
        from django.utils import timezone
        from django.utils.crypto import get_random_string
        from apps.doctors.models import DoctorProfile

        hospital = self._get_hospital(request.user)
        if not hospital:
            return Response({"detail": "No hospital found for this admin."}, status=drf_status.HTTP_404_NOT_FOUND)

        email         = request.data.get("email", "").strip().lower()
        department_id = request.data.get("department_id")
        doctor_id     = request.data.get("doctor_id")
        create_new    = bool(request.data.get("create_new"))

        def normalize_bool(value, default=True):
            if value is None:
                return default
            if isinstance(value, bool):
                return value
            return str(value).lower() in {"1", "true", "yes", "active", "نشط"}

        def response_for(doctor_user, link, created_status=drf_status.HTTP_201_CREATED):
            profile = getattr(doctor_user, "doctor_profile", None)
            return Response(
                {
                    "id":                 profile.id if profile else doctor_user.id,
                    "user_id":            doctor_user.id,
                    "full_name":          doctor_user.full_name or doctor_user.username,
                    "name":               doctor_user.full_name or doctor_user.username,
                    "email":              doctor_user.email,
                    "phone":              getattr(doctor_user, "phone", None),
                    "specialty":          profile.specialty if profile else None,
                    "specialization":     profile.specialty if profile else None,
                    "experience_years":   profile.experience_years if profile else None,
                    "profile_image":      profile.profile_image if profile else None,
                    "image":              profile.profile_image if profile else None,
                    "hospital":           hospital.id,
                    "hospital_id":        hospital.id,
                    "hospital_doctor_id": link.id,
                    "is_active":          link.is_active,
                },
                status=created_status,
            )

        if not email and not doctor_id:
            return Response({"detail": "email or doctor_id is required."}, status=drf_status.HTTP_400_BAD_REQUEST)

        User = get_user_model()

        doctor_user = None
        if doctor_id:
            # Accept either User.id or DoctorProfile.id from older search components.
            doctor_user = User.objects.filter(pk=doctor_id, is_doctor=True).first()
            if doctor_user is None:
                profile = DoctorProfile.objects.select_related("user").filter(pk=doctor_id).first()
                if profile:
                    doctor_user = profile.user

        if doctor_user is None and email:
            doctor_user = User.objects.filter(email=email, is_doctor=True).first()

        if doctor_user is None and create_new:
            first_name = request.data.get("first_name", "").strip()
            last_name  = request.data.get("last_name", "").strip()
            full_name  = request.data.get("full_name", "").strip() or f"{first_name} {last_name}".strip()
            phone      = request.data.get("phone", "").strip() or None
            specialty  = request.data.get("specialty", "").strip()

            errors = {}
            if not full_name:
                errors["first_name"] = ["Doctor name is required."]
            if not email:
                errors["email"] = ["Email is required."]
            if not phone:
                errors["phone"] = ["Phone number is required."]
            if not specialty:
                errors["specialty"] = ["Medical specialty is required."]
            if email and User.objects.filter(email=email).exists():
                errors["email"] = ["A user with this email already exists."]
            if phone and User.objects.filter(phone=phone).exists():
                errors["phone"] = ["A user with this phone already exists."]
            if errors:
                return Response({"detail": "Validation failed.", "errors": errors}, status=drf_status.HTTP_400_BAD_REQUEST)

            base_username = (email.split("@")[0] or "doctor").replace(".", "_").replace("+", "_")[:40]
            username = base_username
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{get_random_string(5).lower()}"

            years_raw = request.data.get("experience_years")
            start_of_practice_date = None
            try:
                years = int(years_raw) if years_raw not in (None, "") else None
                if years is not None and years >= 0:
                    today = timezone.now().date()
                    start_of_practice_date = today.replace(year=max(1, today.year - years))
            except (TypeError, ValueError):
                pass

            job_title = request.data.get("job_title", "").strip()
            education = [{"degree": job_title}] if job_title else []

            with transaction.atomic():
                doctor_user = User.objects.create(
                    username=username,
                    email=email,
                    full_name=full_name,
                    phone=phone,
                    role="doctor",
                    is_doctor=True,
                    is_active=normalize_bool(request.data.get("is_active"), True),
                )
                doctor_user.set_unusable_password()
                doctor_user.save(update_fields=["password"])
                DoctorProfile.objects.create(
                    user=doctor_user,
                    specialty=specialty,
                    gender=request.data.get("gender", "").strip(),
                    bio=request.data.get("bio", "").strip(),
                    profile_image=request.data.get("profile_image", "").strip() or None,
                    start_of_practice_date=start_of_practice_date,
                    education=education,
                    profile_completed=True,
                )
        elif doctor_user is None:
            return Response(
                {"detail": f"No doctor account found with email '{email}'."},
                status=drf_status.HTTP_404_NOT_FOUND,
            )

        department = None
        if department_id:
            from apps.departments.models import Department
            try:
                department = Department.objects.get(pk=department_id, hospital=hospital)
            except Department.DoesNotExist:
                pass

        link, created = HospitalDoctor.objects.get_or_create(
            user=doctor_user,
            hospital=hospital,
            defaults={"is_active": True, "department": department},
        )
        if not created:
            if link.is_active:
                return Response(
                    {"detail": "Doctor is already linked to this hospital."},
                    status=drf_status.HTTP_409_CONFLICT,
                )
            link.is_active = True
            if department:
                link.department = department
            link.save()

        return response_for(doctor_user, link)

    def get(self, request):
        from hospital.models import Hospital, HospitalDoctor
        # FIX B-03/F-08: StandardPagination imported at module level (consistent envelope)

        hospitals = get_hospitals_for_admin(request.user)
        # FIX: HospitalDoctor uses 'user' FK not 'doctor' — select_related correctly
        hospital_doctors = HospitalDoctor.objects.filter(
            hospital__in=hospitals, is_active=True
        ).select_related("user", "user__doctor_profile", "department").order_by("user__full_name")

        pager = StandardPagination()  # FIX B-03/F-08: was raw PageNumberPagination() — inconsistent page_size + envelope
        pager.page_size = 20
        page = pager.paginate_queryset(hospital_doctors, request)

        # Build response manually to include flattened user+profile+hospital fields
        data = []
        for hd in page:
            u = hd.user
            if not u:
                continue
            profile = getattr(u, "doctor_profile", None)
            data.append({
                "id":              profile.id if profile else u.id,
                "user_id":         u.id,
                "full_name":       u.full_name or u.username,
                "name":            u.full_name or u.username,
                "email":           u.email,
                "phone":           getattr(u, "phone", None),
                "specialty":       profile.specialty if profile else None,
                "experience_years": profile.experience_years if profile else None,
                "profile_image":   profile.profile_image if profile else None,
                "image":           profile.profile_image if profile else None,
                "department":      hd.department.name if hd.department else None,
                "is_active":       hd.is_active,
                "hospital":        hd.hospital_id,
                "hospital_id":     hd.hospital_id,
                "hospital_doctor_id": hd.id,
            })
        return pager.get_paginated_response(data)


class HospitalDoctorDetailView(APIView):
    """GET/PATCH /api/v1/hospital/doctors/{id}/ — specific doctor details."""
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def _get_link(self, request, pk):
        from hospital.models import HospitalDoctor

        hospitals = get_hospitals_for_admin(request.user)
        qs = HospitalDoctor.objects.filter(hospital__in=hospitals).select_related(
            "user", "user__doctor_profile", "hospital", "department"
        )
        link = qs.filter(user__doctor_profile__id=pk).first()
        if not link:
            link = qs.filter(pk=pk).first()
        if not link:
            link = qs.filter(user_id=pk).first()
        return link

    def _response_for(self, link):
        user = link.user
        profile = getattr(user, "doctor_profile", None)
        return {
            "id": profile.id if profile else user.id,
            "user_id": user.id,
            "full_name": user.full_name or user.username,
            "name": user.full_name or user.username,
            "email": user.email,
            "phone": getattr(user, "phone", None),
            "specialty": profile.specialty if profile else None,
            "specialization": profile.specialty if profile else None,
            "experience_years": profile.experience_years if profile else None,
            "profile_image": profile.profile_image if profile else None,
            "image": profile.profile_image if profile else None,
            "department": link.department.name if link.department else None,
            "is_active": link.is_active,
            "hospital": link.hospital_id,
            "hospital_id": link.hospital_id,
            "hospital_doctor_id": link.id,
        }

    def get(self, request, pk):
        from rest_framework import status

        link = self._get_link(request, pk)
        if not link or not link.user:
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(self._response_for(link))

    def patch(self, request, pk):
        from django.db import transaction
        from rest_framework import status

        link = self._get_link(request, pk)
        if not link or not link.user:
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

        user = link.user
        profile = getattr(user, "doctor_profile", None)

        full_name = request.data.get("full_name", None)
        email = request.data.get("email", None)
        phone = request.data.get("phone", None)
        specialty = request.data.get("specialty", None)
        is_active = request.data.get("is_active", None)

        if full_name is not None and not str(full_name).strip():
            return Response({"full_name": ["Doctor name is required."]}, status=status.HTTP_400_BAD_REQUEST)
        if email is not None and not str(email).strip():
            return Response({"email": ["Email is required."]}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user_updates = []
            if full_name is not None:
                user.full_name = str(full_name).strip()
                user_updates.append("full_name")
            if email is not None:
                user.email = str(email).strip().lower()
                user_updates.append("email")
            if phone is not None:
                user.phone = str(phone).strip() or None
                user_updates.append("phone")
            if user_updates:
                user.save(update_fields=user_updates)

            if profile and specialty is not None:
                profile.specialty = str(specialty).strip()
                profile.save(update_fields=["specialty", "updated_at"])

            if is_active is not None:
                if isinstance(is_active, bool):
                    active_value = is_active
                else:
                    active_value = str(is_active).lower() in {"1", "true", "yes", "active", "نشط"}
                link.is_active = active_value
                user.is_active = active_value
                link.save(update_fields=["is_active"])
                user.save(update_fields=["is_active"])

        link = self._get_link(request, pk)
        return Response(self._response_for(link))


class HospitalPatientListView(APIView):
    """GET /api/v1/hospital/patients/ — patients who booked in admin's hospital."""
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def get(self, request):
        from hospital.models import Hospital
        from appointments.models import Appointment
        # FIX B-03/F-08: StandardPagination imported at module level (consistent envelope)
        from apps.patients.models import PatientProfile
        from django.db.models import Max, Count

        hospitals = get_hospitals_for_admin(request.user)  # FIX BUG-01: Hospital has no direct admin field
        patient_ids = Appointment.objects.filter(
            hospital__in=hospitals
        ).values_list("patient_id", flat=True).distinct()

        qs = PatientProfile.objects.filter(
            user_id__in=patient_ids
        ).select_related("user").order_by("user__last_name")

        pager = StandardPagination()  # FIX B-03/F-08: was raw PageNumberPagination() — inconsistent page_size + envelope
        pager.page_size = 20
        page = pager.paginate_queryset(qs, request)

        # Build enrichment maps for this page
        user_ids = [pp.user_id for pp in page]
        last_appt_map = dict(
            Appointment.objects
            .filter(hospital__in=hospitals, patient_id__in=user_ids)
            .values("patient_id")
            .annotate(last=Max("created_at"))
            .values_list("patient_id", "last")
        )
        total_appt_map = dict(
            Appointment.objects
            .filter(hospital__in=hospitals, patient_id__in=user_ids)
            .values("patient_id")
            .annotate(cnt=Count("id"))
            .values_list("patient_id", "cnt")
        )

        data = []
        for pp in page:
            u    = pp.user
            last = last_appt_map.get(u.id)
            data.append({
                # Flat fields — no nested user object needed by frontend
                "id":                 pp.id,
                "user_id":            u.id,
                "full_name":          u.full_name or u.username,
                "email":              u.email,
                "phone":              getattr(u, "phone", None),
                "city":               getattr(u, "city", None),
                "gender":             pp.gender,
                "age":                pp.age,
                "dob":                str(pp.dob) if pp.dob else None,
                "notes":              pp.notes,
                "last_appointment":   last.date().isoformat() if last else None,
                "total_appointments": total_appt_map.get(u.id, 0),
            })
        return pager.get_paginated_response(data)


class HospitalAssistantListView(APIView):
    """
    GET  /api/v1/hospital/assistants/     — list assistants assigned to admin's hospital
    POST /api/v1/hospital/assistants/     — assign existing user (by email) as assistant
    Body: { "email": "...", "role": "receptionist" }
    """
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def _get_hospital(self, user):
        from hospital.models import Hospital
        return get_hospitals_for_admin(user).first()  # FIX BUG-01

    def get(self, request):
        from hospital.models import Hospital, HospitalAssistant
        from apps.assistants.serializers import AssistantProfileSerializer
        # FIX B-03/F-08: StandardPagination imported at module level (consistent envelope)

        hospitals = get_hospitals_for_admin(request.user)  # FIX BUG-01: Hospital has no direct admin field
        hospital_assistants = HospitalAssistant.objects.filter(
            hospital__in=hospitals, is_active=True
        ).select_related("assistant__user", "hospital").order_by("assistant__user__full_name", "assistant__user__username")

        pager = StandardPagination()  # FIX B-03/F-08: was raw PageNumberPagination() — inconsistent page_size + envelope
        pager.page_size = 20
        page = pager.paginate_queryset(hospital_assistants, request)
        data = []
        for ha in page:
            assistant = ha.assistant
            user = assistant.user
            serialized = AssistantProfileSerializer(assistant, context={"request": request}).data
            data.append({
                **serialized,
                "id": assistant.id,
                "user_id": user.id,
                "hospital_assistant_id": ha.id,
                "hospital": ha.hospital_id,
                "hospital_id": ha.hospital_id,
                "hospital_name": ha.hospital.name,
                "full_name": user.full_name or user.username,
                "name": user.full_name or user.username,
                "email": user.email,
                "phone": getattr(user, "phone", None),
                "role": ha.role,
                "is_active": ha.is_active,
                "assigned_at": ha.assigned_at,
            })
        return pager.get_paginated_response(data)

    def post(self, request):
        """
        Assign an existing assistant (by email) to this hospital.
        Body: { "email": "assistant@email.com", "role": "receptionist" }
        """
        from hospital.models import HospitalAssistant
        from apps.assistants.models import AssistantProfile
        from apps.assistants.serializers import AssistantProfileSerializer
        from django.contrib.auth import get_user_model

        hospital = self._get_hospital(request.user)
        if not hospital:
            return Response({"detail": "No hospital found."}, status=status.HTTP_404_NOT_FOUND)

        email        = request.data.get("email")
        assistant_id = request.data.get("assistant_id")
        role         = request.data.get("role", "receptionist")

        if not email and not assistant_id:
            return Response(
                {"detail": "email or assistant_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        try:
            if assistant_id:
                assistant = AssistantProfile.objects.select_related("user").get(pk=assistant_id)
            else:
                user = User.objects.get(email=email, is_assistant=True)
                assistant = AssistantProfile.objects.select_related("user").get(user=user)
        except (User.DoesNotExist, AssistantProfile.DoesNotExist):
            return Response(
                {"detail": "No assistant account found with that email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        link, created = HospitalAssistant.objects.get_or_create(
            assistant=assistant,
            hospital=hospital,
            defaults={"role": role, "is_active": True},
        )
        if not created:
            if link.is_active:
                return Response(
                    {"detail": "Assistant is already assigned to this hospital."},
                    status=status.HTTP_409_CONFLICT,
                )
            link.is_active = True
            link.role = role
            link.save()

        return Response(
            {
                **AssistantProfileSerializer(assistant, context={"request": request}).data,
                "id": assistant.id,
                "user_id": assistant.user_id,
                "hospital_assistant_id": link.id,
                "hospital": hospital.id,
                "hospital_id": hospital.id,
                "hospital_name": hospital.name,
                "full_name": assistant.user.full_name or assistant.user.username,
                "name": assistant.user.full_name or assistant.user.username,
                "email": assistant.user.email,
                "phone": getattr(assistant.user, "phone", None),
                "role": link.role,
                "is_active": link.is_active,
                "assigned_at": link.assigned_at,
            },
            status=status.HTTP_201_CREATED,
        )


class HospitalAssistantDetailView(APIView):
    """DELETE /api/v1/hospital/assistants/{pk}/ — remove assistant from hospital."""
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def delete(self, request, pk):
        from hospital.models import Hospital, HospitalAssistant
        from apps.assistants.models import AssistantProfile

        hospitals = get_hospitals_for_admin(request.user)  # FIX BUG-01: Hospital has no direct admin field
        try:
            assistant = AssistantProfile.objects.get(pk=pk)
            link = HospitalAssistant.objects.get(
                assistant=assistant, hospital__in=hospitals
            )
            link.is_active = False
            link.save()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except (AssistantProfile.DoesNotExist, HospitalAssistant.DoesNotExist):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)



class HospitalProfileView(APIView):
    """GET/PATCH /api/v1/hospital/profile/ — hospital admin updates their hospital profile."""
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def _get_hospital(self, user):
        from hospital.models import Hospital
        return get_hospitals_for_admin(user).first()  # FIX BUG-01

    def get(self, request):
        from hospital.serializers import HospitalSerializer
        hospital = self._get_hospital(request.user)
        if not hospital:
            from rest_framework import status
            return Response({'detail': 'No hospital found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(HospitalSerializer(hospital, context={'request': request}).data)

    def patch(self, request):
        from hospital.serializers import HospitalSerializer
        from rest_framework import status
        hospital = self._get_hospital(request.user)
        if not hospital:
            return Response({'detail': 'No hospital found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = HospitalSerializer(hospital, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class HospitalDepartmentsView(APIView):
    """GET/POST /api/v1/hospital/departments/ — manage departments in admin hospital."""
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def _get_hospital(self, user):
        from hospital.models import Hospital
        return get_hospitals_for_admin(user).first()  # FIX BUG-01

    def get(self, request):
        from apps.departments.models import Department
        from apps.departments.serializers import DepartmentSerializer
        hospital = self._get_hospital(request.user)
        if not hospital:
            return Response([])
        depts = Department.objects.filter(hospital=hospital)
        return Response(DepartmentSerializer(depts, many=True).data)

    def post(self, request):
        from apps.departments.serializers import DepartmentSerializer
        from rest_framework import status
        hospital = self._get_hospital(request.user)
        if not hospital:
            return Response({'detail': 'No hospital found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DepartmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(hospital=hospital)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class HospitalDepartmentDetailView(APIView):
    """DELETE /api/v1/hospital/departments/{id}/."""
    permission_classes = [IsAuthenticated, IsHospitalAdmin]

    def delete(self, request, pk):
        from apps.departments.models import Department
        from rest_framework import status
        try:
            dept = Department.objects.get(pk=pk)
            dept.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Department.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)


urlpatterns = [
    # GET /api/v1/hospital/overview/
    path("overview/",              HospitalDashboardView.as_view(),      name="hospital-overview"),
    # GET /api/v1/hospital/analytics/  — M-09 FIX: now a dedicated view with analytics-specific fields
    path("analytics/",             HospitalAnalyticsView.as_view(),      name="hospital-analytics"),
    # GET /api/v1/hospital/appointments/
    path("appointments/",          HospitalAppointmentListView.as_view(), name="hospital-appointments"),
    # GET /api/v1/hospital/doctors/
    path("doctors/",               HospitalDoctorListView.as_view(),     name="hospital-doctors"),
    # GET /api/v1/hospital/doctors/{id}/
    path("doctors/<int:pk>/",      HospitalDoctorDetailView.as_view(),   name="hospital-doctor-detail"),
    # GET /api/v1/hospital/patients/
    path("patients/",              HospitalPatientListView.as_view(),    name="hospital-patients"),
    # GET/POST /api/v1/hospital/assistants/
    path("assistants/",            HospitalAssistantListView.as_view(),   name="hospital-assistants"),
    # DELETE /api/v1/hospital/assistants/{id}/
    path("assistants/<int:pk>/",   HospitalAssistantDetailView.as_view(), name="hospital-assistant-detail"),
    # GET/PATCH /api/v1/hospital/profile/
    path("profile/",               HospitalProfileView.as_view(),        name="hospital-profile"),
    # GET/POST /api/v1/hospital/departments/
    path("departments/",            HospitalDepartmentsView.as_view(),    name="hospital-departments"),
    # DELETE /api/v1/hospital/departments/{id}/
    path("departments/<int:pk>/",   HospitalDepartmentDetailView.as_view(), name="hospital-department-delete"),
]
