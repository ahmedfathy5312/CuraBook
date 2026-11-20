"""
CuraBook — Scheduling Views
============================
All schedule/slot management endpoints.
Uses Schedule model (WorkingHours was removed in migration 0003).

Endpoints:
  /api/v1/schedules/                    → ScheduleViewSet  (doctor CRUD on own schedules)
  /api/v1/schedules/timeoffs/           → TimeOffViewSet
  /api/v1/schedules/slots/              → GeneratedSlotViewSet
  /api/v1/schedules/blocked/            → BlockedSlotViewSet
  /api/v1/schedules/public/slots/       → PublicSlotListView (patient browsing)
"""

from rest_framework import viewsets, generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from core.throttles import AuthSearchRateThrottle

from .models import Schedule, TimeOff, GeneratedSlot, BlockedSlot
from .serializers import (
    ScheduleSerializer,
    TimeOffSerializer,
    SlotPublicSerializer,
    SlotAdminSerializer,
    BlockedSlotSerializer,
)
from .permissions import IsDoctor, IsDoctorOwner, IsDoctorOrHospitalAdmin
from .services import generate_slots_from_schedule, generate_slots, book_slot, create_blocked_slot
from scheduling.selectors import (
    get_schedules_for_doctor,
    get_available_slots_for_doctor,
    get_slot_by_id,
)
from core.permissions.policies import SchedulePolicy


# ─────────────────────────────────────────────────────────────────────────────
# Schedule ViewSet — Doctor manages own weekly schedules
# GET/POST/PUT/PATCH/DELETE /api/v1/schedules/
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# API-M05 FIX — Standard Pagination for scheduling endpoints
# Without this, ScheduleViewSet returned ALL schedules in one response.
# Doctors with many schedules (multi-clinic) could get huge unbounded lists.
# ─────────────────────────────────────────────────────────────────────────────
class SchedulePagination(PageNumberPagination):
    page_size            = 20
    page_size_query_param = 'page_size'
    max_page_size        = 100


class SlotPagination(PageNumberPagination):
    page_size            = 50   # slots are small — 50 per page is fine
    page_size_query_param = 'page_size'
    max_page_size        = 200


class ScheduleViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for doctor's Schedule entries.
    Each entry = one day-of-week working block at a clinic or hospital.

    Query params:
      ?clinic=<id>    — filter by clinic
      ?hospital=<id>  — filter by hospital
      ?is_active=true — only active schedules

    BUG-2 FIX: Hospital admins can now create/manage schedules for their linked
    doctors. When a hospital admin submits a schedule, they must include a
    `doctor` field (the HospitalDoctor record id or user id). The backend
    verifies the doctor belongs to the admin's hospital before saving.
    """
    serializer_class   = ScheduleSerializer
    pagination_class   = SchedulePagination  # API-M05 FIX: was unbounded

    def get_permissions(self):
        """
        BUG-2 FIX: Doctors manage their own schedules.
        Hospital admins can also create/read schedules for their hospital's doctors.
        """
        user = self.request.user
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsAuthenticated()]
        # Write access: doctor OR hospital admin
        from rest_framework.permissions import IsAuthenticated as IA
        return [IA()]

    def _is_hospital_admin(self):
        return bool(getattr(self.request.user, 'hospital_admin', False))

    def _check_write_permission(self):
        """Raise PermissionDenied if user is neither a doctor nor a hospital admin."""
        from rest_framework.exceptions import PermissionDenied
        user = self.request.user
        if getattr(user, 'is_doctor', False) or self._is_hospital_admin() or user.is_staff or getattr(user, 'is_assistant', False):
            return
        raise PermissionDenied("This operation is available to doctors and hospital admins only.")

    def get_queryset(self):
        user = self.request.user
        from .selectors import get_schedules_for_hospital

        # Hospital admin: return schedules for all doctors in their hospital
        if self._is_hospital_admin() and not getattr(user, 'is_doctor', False):
            hospital_ids = set(user.hospital_admin_links.values_list('hospital_id', flat=True))
            from .models import Schedule as Sched
            qs = Sched.objects.filter(hospital_id__in=hospital_ids).select_related('doctor', 'clinic', 'hospital')
        elif getattr(user, 'is_assistant', False):
            from apps.assistants.selectors import get_assistant_profile
            profile = get_assistant_profile(user)
            clinic_ids = []
            hospital_ids = []
            if profile:
                try:
                    from clinics.models import ClinicAssistant
                    clinic_ids = list(ClinicAssistant.objects.filter(assistant=profile, is_active=True).values_list('clinic_id', flat=True))
                except Exception:
                    clinic_ids = []
                try:
                    from hospital.models import HospitalAssistant
                    hospital_ids = list(HospitalAssistant.objects.filter(assistant=profile, is_active=True).values_list('hospital_id', flat=True))
                except Exception:
                    hospital_ids = []
            from django.db.models import Q
            from .models import Schedule as Sched
            qs = Sched.objects.filter(
                Q(clinic_id__in=clinic_ids) | Q(hospital_id__in=hospital_ids)
            ).select_related('doctor', 'clinic', 'hospital')
        else:
            qs = get_schedules_for_doctor(user)

        # Optional filters
        clinic_id   = self.request.query_params.get('clinic')
        hospital_id = self.request.query_params.get('hospital')
        doctor_id   = self.request.query_params.get('doctor')
        is_active   = self.request.query_params.get('is_active')

        if clinic_id:
            qs = qs.filter(clinic_id=clinic_id)
        if hospital_id:
            qs = qs.filter(hospital_id=hospital_id)
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)
        if is_active is not None:
            qs = qs.filter(is_active=(is_active.lower() == 'true'))

        return qs

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied, ValidationError
        from django.db import IntegrityError
        user = self.request.user
        self._check_write_permission()

        if self._is_hospital_admin() and not getattr(user, 'is_doctor', False):
            # Hospital admin creating schedule on behalf of a doctor
            from django.contrib.auth import get_user_model
            User = get_user_model()
            doctor_id = self.request.data.get('doctor')
            if not doctor_id:
                raise ValidationError({'doctor': 'Hospital admin must specify the doctor field.'})

            # Verify this doctor belongs to the admin's hospital
            hospital_ids = set(user.hospital_admin_links.values_list('hospital_id', flat=True))
            from hospital.models import HospitalDoctor
            link_exists = HospitalDoctor.objects.filter(
                user_id=doctor_id,
                hospital_id__in=hospital_ids,
                is_active=True,
            ).exists()
            if not link_exists:
                # Try by HospitalDoctor.id (the link record id)
                link_exists = HospitalDoctor.objects.filter(
                    id=doctor_id,
                    hospital_id__in=hospital_ids,
                    is_active=True,
                ).exists()
                if not link_exists:
                    raise PermissionDenied("The specified doctor is not linked to your hospital.")

            try:
                doctor_user = User.objects.get(pk=doctor_id)
            except User.DoesNotExist:
                # doctor_id might be HospitalDoctor link id, get actual user
                hd = HospitalDoctor.objects.filter(id=doctor_id, hospital_id__in=hospital_ids).first()
                if not hd:
                    raise ValidationError({'doctor': 'Doctor not found.'})
                doctor_user = hd.user

            target_doctor = doctor_user

            hospital_in_data = serializer.validated_data.get('hospital')
            clinic_in_data = serializer.validated_data.get('clinic')
            if not hospital_in_data:
                raise ValidationError({
                    'hospital': 'Hospital admins must create schedules for one of their hospitals.'
                })
            if hospital_in_data.id not in hospital_ids:
                raise PermissionDenied("You cannot create schedules for a hospital you do not manage.")
            if clinic_in_data:
                raise ValidationError({
                    'clinic': 'Hospital admins cannot create schedules linked to private clinics.'
                })
        else:
            if getattr(user, 'is_assistant', False):
                from apps.assistants.selectors import get_assistant_profile
                from django.contrib.auth import get_user_model
                User = get_user_model()
                doctor_id = self.request.data.get('doctor')
                if not doctor_id:
                    raise ValidationError({'doctor': 'Assistant must specify the doctor field.'})

                profile = get_assistant_profile(user)
                clinic_ids = []
                hospital_ids = []
                if profile:
                    try:
                        from clinics.models import ClinicAssistant
                        clinic_ids = list(ClinicAssistant.objects.filter(assistant=profile, is_active=True).values_list('clinic_id', flat=True))
                    except Exception:
                        clinic_ids = []
                    try:
                        from hospital.models import HospitalAssistant
                        hospital_ids = list(HospitalAssistant.objects.filter(assistant=profile, is_active=True).values_list('hospital_id', flat=True))
                    except Exception:
                        hospital_ids = []

                hospital_in_data = serializer.validated_data.get('hospital')
                clinic_in_data = serializer.validated_data.get('clinic')
                if clinic_in_data and clinic_in_data.id not in clinic_ids:
                    raise PermissionDenied("You cannot create schedules for a clinic you are not assigned to.")
                if hospital_in_data and hospital_in_data.id not in hospital_ids:
                    raise PermissionDenied("You cannot create schedules for a hospital you are not assigned to.")
                if not clinic_in_data and not hospital_in_data:
                    raise ValidationError({'clinic': 'A schedule must be linked to one of your assigned workplaces.'})

                try:
                    target_doctor = User.objects.get(pk=doctor_id, is_doctor=True)
                except User.DoesNotExist:
                    raise ValidationError({'doctor': 'Doctor not found.'})

                if clinic_in_data:
                    from apps.doctors.models import DoctorProfile
                    if not DoctorProfile.objects.filter(user=target_doctor, clinic_affiliations__clinic=clinic_in_data).exists():
                        raise PermissionDenied("The specified doctor is not linked to this clinic.")
                if hospital_in_data:
                    from hospital.models import HospitalDoctor
                    if not HospitalDoctor.objects.filter(user=target_doctor, hospital=hospital_in_data, is_active=True).exists():
                        raise PermissionDenied("The specified doctor is not linked to this hospital.")
            else:
                # Regular doctor saving their own schedule
                target_doctor = user

        # ── BUG #2 FIX: Upsert logic ─────────────────────────────────────────
        # When the frontend sends a POST for a day that already has a schedule,
        # the unique_together constraint would raise an IntegrityError.
        # Instead of letting that surface as a 500, we catch it and UPDATE
        # the existing schedule, making POST idempotent (create-or-update).
        try:
            serializer.save(doctor=target_doctor)
        except IntegrityError:
            # A schedule for this doctor/day/location already exists — update it instead
            data = serializer.validated_data
            existing = Schedule.objects.filter(
                doctor=target_doctor,
                day_of_week=data.get('day_of_week'),
                clinic=data.get('clinic'),
                hospital=data.get('hospital'),
            ).first()
            if existing:
                for field, value in data.items():
                    setattr(existing, field, value)
                existing.save()
                # Update the serializer instance so the response reflects the updated object
                serializer.instance = existing
            else:
                raise

    def perform_update(self, serializer):
        self._check_write_permission()
        serializer.save()

    def perform_destroy(self, instance):
        self._check_write_permission()
        instance.delete()

    @action(detail=True, methods=['post'], url_path='generate-slots')
    def generate_slots(self, request, pk=None):
        """
        POST /api/v1/schedules/{id}/generate-slots/
        Body: { "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD",
                "override_existing": false, "doctor_id": <int> (hospital admin only) }

        Bug #2/#3 Fix: hospital admins can now call this endpoint.
        They must ensure the schedule belongs to a doctor in their hospital.
        """
        from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
        schedule  = self.get_object()
        user      = request.user
        start_raw = request.data.get('start_date')
        end_raw   = request.data.get('end_date')
        override  = request.data.get('override_existing', False)

        # Hospital admin permission check: verify schedule's doctor is in their hospital
        if self._is_hospital_admin() and not getattr(user, 'is_doctor', False):
            hospital_ids = set(user.hospital_admin_links.values_list('hospital_id', flat=True))
            from hospital.models import HospitalDoctor
            schedule_doctor_id = getattr(schedule, 'doctor_id', None) or getattr(getattr(schedule, 'doctor', None), 'id', None)
            if schedule_doctor_id and not HospitalDoctor.objects.filter(
                user_id=schedule_doctor_id,
                hospital_id__in=hospital_ids,
                is_active=True,
            ).exists():
                raise DRFPermissionDenied(
                    "You can only generate slots for doctors linked to your hospital."
                )

        if not start_raw or not end_raw:
            return Response(
                {'error': 'start_date and end_date are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from datetime import date
            start = date.fromisoformat(start_raw)
            end   = date.fromisoformat(end_raw)
        except ValueError as e:
            return Response({'error': f'Invalid date format: {e}'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            slots = generate_slots_from_schedule(
                schedule=schedule,
                start_date=start,
                end_date=end,
                override_existing=override,
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'created': len(slots),
            'message': f'Generated {len(slots)} slots from schedule {schedule.id}.',
            'slots': SlotAdminSerializer(slots, many=True).data,
        }, status=status.HTTP_201_CREATED)


# Keep backward-compatible alias for old /working-hours/ endpoint
class WorkingHoursViewSet(ScheduleViewSet):
    """
    Backward-compatible alias for ScheduleViewSet.
    Maps /api/v1/schedules/working-hours/ → same as /api/v1/schedules/
    """
    pass


# ─────────────────────────────────────────────────────
# Time Off — doctor or hospital admin
# ─────────────────────────────────────────────────────
class TimeOffViewSet(viewsets.ModelViewSet):
    serializer_class   = TimeOffSerializer
    # Bug #2 Fix: hospital admins can also manage time-off for their doctors
    permission_classes = [IsAuthenticated, IsDoctorOrHospitalAdmin]

    def _is_hospital_admin(self):
        return bool(getattr(self.request.user, 'hospital_admin', False))

    def get_queryset(self):
        user = self.request.user
        if self._is_hospital_admin() and not getattr(user, 'is_doctor', False):
            # Return time-offs for all doctors in admin's hospitals
            hospital_ids = user.hospital_admin_links.values_list('hospital_id', flat=True)
            doctor_id = self.request.query_params.get('doctor')
            qs = TimeOff.objects.filter(
                doctor__hospital_admin_links__hospital_id__in=hospital_ids
            ).distinct()
            if doctor_id:
                qs = qs.filter(doctor_id=doctor_id)
            return qs
        return TimeOff.objects.filter(doctor=user)

    def perform_create(self, serializer):
        user = self.request.user
        if self._is_hospital_admin() and not getattr(user, 'is_doctor', False):
            from rest_framework.exceptions import ValidationError, PermissionDenied
            from django.contrib.auth import get_user_model
            doctor_id = self.request.data.get('doctor')
            if not doctor_id:
                raise ValidationError({'doctor': 'Hospital admin must specify the doctor field.'})
            hospital_ids = set(user.hospital_admin_links.values_list('hospital_id', flat=True))
            from hospital.models import HospitalDoctor
            if not HospitalDoctor.objects.filter(user_id=doctor_id, hospital_id__in=hospital_ids, is_active=True).exists():
                raise PermissionDenied("The specified doctor is not linked to your hospital.")
            doctor_user = get_user_model().objects.get(pk=doctor_id)
            serializer.save(doctor=doctor_user)
        else:
            serializer.save(doctor=user)


# ─────────────────────────────────────────────────────
# Generated Slots — doctor manages own slots
# ─────────────────────────────────────────────────────
class GeneratedSlotViewSet(viewsets.ModelViewSet):
    """
    Bug #2 / Bug #3 Fix — Generated Slots management.

    Previously locked to IsDoctor only, causing hospital admins to get
    "This operation is available to doctors only." on Save Schedule and
    Generate Slots buttons in the hospital dashboard.

    Fixed:
    - permission_classes → IsDoctorOrHospitalAdmin (doctors + hospital admins + staff)
    - get_queryset()     → hospital admins see slots for all their hospital's doctors
    - perform_create()  → hospital admins assign the slot to the correct doctor
    - generate action   → hospital admins pass a doctor_id; the system generates
                          slots from that doctor's schedules (not the admin's account)
    """
    pagination_class   = SlotPagination
    # Bug #2/#3 Fix: single permission class that passes for both doctors and hospital admins
    permission_classes = [IsAuthenticated, IsDoctorOrHospitalAdmin]

    # ── helpers ────────────────────────────────────────────────────────────────

    def _is_hospital_admin(self):
        return bool(getattr(self.request.user, 'hospital_admin', False))

    def _resolve_doctor_for_admin(self, doctor_id=None):
        """
        Bug #3 Fix: For hospital admins, resolve the target doctor user.
        Raises ValidationError or PermissionDenied if the doctor is not
        linked to the admin's hospital.
        """
        from rest_framework.exceptions import ValidationError, PermissionDenied
        from django.contrib.auth import get_user_model
        from hospital.models import HospitalDoctor

        User = get_user_model()
        user = self.request.user

        if not doctor_id:
            raise ValidationError({'doctor': 'Hospital admin must provide a doctor_id or doctor field.'})

        hospital_ids = set(user.hospital_admin_links.values_list('hospital_id', flat=True))

        # Accept either user pk or HospitalDoctor link pk
        linked = HospitalDoctor.objects.filter(
            user_id=doctor_id,
            hospital_id__in=hospital_ids,
            is_active=True,
        ).first()
        if not linked:
            linked = HospitalDoctor.objects.filter(
                id=doctor_id,
                hospital_id__in=hospital_ids,
                is_active=True,
            ).first()
        if not linked:
            raise PermissionDenied(
                "The specified doctor is not linked to your hospital or the account does not exist."
            )

        try:
            return User.objects.get(pk=linked.user_id)
        except User.DoesNotExist:
            raise PermissionDenied("Doctor user account not found.")

    # ── queryset ───────────────────────────────────────────────────────────────

    def get_queryset(self):
        user   = self.request.user
        params = self.request.query_params

        # Hospital admin path
        if self._is_hospital_admin() and not getattr(user, 'is_doctor', False):
            hospital_ids = user.hospital_admin_links.values_list('hospital_id', flat=True)
            qs = (
                GeneratedSlot.objects
                .filter(hospital_id__in=hospital_ids)
                .select_related('clinic', 'hospital', 'doctor', 'schedule')
                .order_by('start')
            )
            doctor_id = params.get('doctor') or params.get('doctor_id')
            if doctor_id:
                qs = qs.filter(doctor_id=doctor_id)
            from_str = params.get('from') or params.get('start_date')
            to_str   = params.get('to')   or params.get('end_date')
            if from_str:
                qs = qs.filter(start__date__gte=from_str)
            if to_str:
                qs = qs.filter(start__date__lte=to_str)
            return qs

        # Doctor path — management view: all own slots
        if getattr(user, 'is_doctor', False):
            qs = (
                GeneratedSlot.objects
                .select_related('clinic', 'hospital', 'doctor', 'schedule')
                .filter(doctor=user)
                .order_by('start')
            )
            date_str      = params.get('date')
            location_type = params.get('location_type')
            location_id   = params.get('location_id')
            from_str      = params.get('from') or params.get('start_date')
            to_str        = params.get('to')   or params.get('end_date')

            if date_str:
                qs = qs.filter(start__date=date_str)
            else:
                if from_str:
                    qs = qs.filter(start__date__gte=from_str)
                if to_str:
                    qs = qs.filter(start__date__lte=to_str)

            if location_type == 'clinic' and location_id:
                qs = qs.filter(clinic_id=location_id)
            elif location_type == 'hospital' and location_id:
                qs = qs.filter(hospital_id=location_id)

            return qs

        # Platform admin — full read access
        if user.is_staff or getattr(user, 'is_platform_admin', False):
            return GeneratedSlot.objects.filter(is_active=True).select_related('clinic', 'hospital', 'doctor')

        return GeneratedSlot.objects.none()

    # ── serializer ─────────────────────────────────────────────────────────────

    def get_serializer_class(self):
        u = self.request.user
        if getattr(u, 'is_doctor', False) or u.is_staff or self._is_hospital_admin():
            return SlotAdminSerializer
        return SlotPublicSerializer

    # ── mutations ──────────────────────────────────────────────────────────────

    def perform_create(self, serializer):
        """
        Bug #2 Fix: hospital admins assign the slot to the target doctor,
        not to themselves. Doctors assign to themselves as before.
        """
        user = self.request.user
        if self._is_hospital_admin() and not getattr(user, 'is_doctor', False):
            doctor_id  = self.request.data.get('doctor') or self.request.data.get('doctor_id')
            doctor_user = self._resolve_doctor_for_admin(doctor_id)
            serializer.save(doctor=doctor_user)
        else:
            serializer.save(doctor=user)

    # ── generate action ────────────────────────────────────────────────────────

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        POST /api/v1/schedules/slots/generate/
        Body:
          { "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD",
            "override_existing": false,
            "doctor_id": <int>  ← required when called by a hospital admin }

        Bug #3 Fix: hospital admins MUST provide doctor_id.
        The system generates slots from that doctor's active schedules.
        Previously this always used request.user as the doctor, so hospital
        admins would generate slots for themselves (no doctor → no schedules → error).
        """
        from datetime import date as date_type
        from rest_framework.exceptions import ValidationError

        start_raw = request.data.get('start_date')
        end_raw   = request.data.get('end_date')
        override  = bool(request.data.get('override_existing', False))

        if not start_raw or not end_raw:
            return Response(
                {'error': 'start_date and end_date are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start = date_type.fromisoformat(str(start_raw))
            end   = date_type.fromisoformat(str(end_raw))
        except ValueError as e:
            return Response({'error': f'Invalid date format: {e}'}, status=status.HTTP_400_BAD_REQUEST)

        if start > end:
            return Response(
                {'error': 'start_date must be before end_date.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Resolve target doctor ─────────────────────────────────────────────
        if self._is_hospital_admin() and not getattr(request.user, 'is_doctor', False):
            # Bug #3 Fix: hospital admin must specify which doctor
            doctor_id = request.data.get('doctor_id') or request.data.get('doctor')
            try:
                target_doctor = self._resolve_doctor_for_admin(doctor_id)
            except Exception as exc:
                return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        else:
            # Doctor generates their own slots
            target_doctor = request.user

        # ── Find active schedules for the target doctor ───────────────────────
        schedules = Schedule.objects.filter(doctor=target_doctor, is_active=True)
        # GENERATE-FIX (v35): filter by location if provided so the correct
        # clinic/hospital schedule is used when a doctor works in multiple places.
        clinic_id   = request.data.get('clinic')
        hospital_id = request.data.get('hospital')
        if clinic_id:
            schedules = schedules.filter(clinic_id=clinic_id)
        elif hospital_id:
            schedules = schedules.filter(hospital_id=hospital_id)

        if not schedules.exists():
            doctor_name = getattr(target_doctor, 'full_name', None) or target_doctor.get_full_name() or str(target_doctor)
            return Response(
                {'error': f'No active schedules found for {doctor_name}. Create a schedule first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Generate slots ────────────────────────────────────────────────────
        all_slots = []
        try:
            for schedule in schedules:
                slots = generate_slots_from_schedule(
                    schedule=schedule,
                    start_date=start,
                    end_date=end,
                    override_existing=override,
                )
                all_slots.extend(slots)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'created': len(all_slots),
            'message': f'Generated {len(all_slots)} slot(s) from {schedules.count()} schedule(s).',
        }, status=status.HTTP_201_CREATED)

    # ── utility actions ────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        slot = self.get_object()
        slot.is_active = False
        slot.save(update_fields=['is_active'])
        return Response({'status': 'deactivated'})

    @action(detail=True, methods=['post'], url_path='toggle-block')
    def toggle_block(self, request, pk=None):
        """
        POST /api/v1/schedules/slots/{id}/toggle-block/
        Toggles the slot between blocked (is_active=False) and available (is_active=True).
        Only unbooked slots can be toggled.
        """
        slot = self.get_object()
        if slot.is_booked:
            return Response(
                {'error': 'Cannot block a slot that is already booked.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        slot.is_active = not slot.is_active
        slot.save(update_fields=['is_active'])
        new_status = 'available' if slot.is_active else 'blocked'
        return Response({'status': new_status, 'is_active': slot.is_active})

    @action(detail=True, methods=['post'])
    def book(self, request, pk=None):
        try:
            slot = book_slot(slot_id=int(pk))
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SlotPublicSerializer(slot).data)



# ─────────────────────────────────────────────────────
# Public Slot Search — patients browse available slots
# ─────────────────────────────────────────────────────
class PublicSlotListView(generics.ListAPIView):
    """
    GET /api/v1/schedules/public/slots/
    Params: ?doctor=<id>&clinic=<id>&hospital=<id>&from=<date>&to=<date>
    """
    serializer_class   = SlotPublicSerializer
    permission_classes = [IsAuthenticated]
    # API-H09 FIX: rate-limit public slot browsing to prevent DoS / enumeration
    throttle_classes   = [AuthSearchRateThrottle]

    def get_queryset(self):
        params      = self.request.query_params
        doctor_id   = params.get('doctor') or params.get('doctor_id')
        clinic_id   = params.get('clinic') or params.get('clinic_id')
        hospital_id = params.get('hospital') or params.get('hospital_id')
        location_type = params.get('location_type')
        location_id   = params.get('location_id')
        from_date   = params.get('from')
        to_date     = params.get('to')

        if location_type == 'clinic' and location_id and not clinic_id:
            clinic_id = location_id
        elif location_type == 'hospital' and location_id and not hospital_id:
            hospital_id = location_id

        if not doctor_id:
            return GeneratedSlot.objects.none()

        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            doctor = User.objects.get(pk=doctor_id, is_doctor=True, is_active=True)
        except Exception:
            return GeneratedSlot.objects.none()

        try:
            from_dt = timezone.datetime.fromisoformat(from_date) if from_date else None
            to_dt   = timezone.datetime.fromisoformat(to_date)   if to_date   else None
            clinic_pk = int(clinic_id) if clinic_id else None
            hospital_pk = int(hospital_id) if hospital_id else None
        except (TypeError, ValueError):
            return GeneratedSlot.objects.none()

        return get_available_slots_for_doctor(
            doctor=doctor,
            from_date=from_dt,
            to_date=to_dt,
            clinic_id=clinic_pk,
            hospital_id=hospital_pk,
        )


# ─────────────────────────────────────────────────────────────────────────────
# BlockedSlot ViewSet
# ─────────────────────────────────────────────────────────────────────────────
class BlockedSlotViewSet(viewsets.ModelViewSet):
    """
    /api/v1/schedules/blocked/
    Create and manage blocked date ranges (vacations, emergency closures).
    """
    serializer_class   = BlockedSlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_doctor', False):
            return BlockedSlot.objects.filter(doctor=user).order_by("-start_date")
        if getattr(user, 'hospital_admin', False):
            hospital_ids = user.hospital_admin_links.values_list("hospital_id", flat=True)
            return BlockedSlot.objects.filter(hospital_id__in=hospital_ids).order_by("-start_date")
        return BlockedSlot.objects.none()

    def perform_create(self, serializer):
        data = serializer.validated_data
        block, deactivated = create_blocked_slot(
            created_by=self.request.user,
            start_date=data["start_date"],
            end_date=data["end_date"],
            reason=data.get("reason", "other"),
            note=data.get("note", ""),
            doctor=data.get("doctor"),
            clinic=data.get("clinic"),
            hospital=data.get("hospital"),
        )
        serializer.instance = block
        self.deactivated_count = deactivated

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            "success": True,
            "data": serializer.data,
            "message": f"Blocked. {getattr(self, 'deactivated_count', 0)} slots deactivated.",
        }, status=status.HTTP_201_CREATED)
