"""
CuraBook — Appointment ViewSet
=================================
Uses workflow layer exclusively — NO business logic in ViewSet.
All responses use the unified success envelope.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import PermissionDenied  # H-08 FIX: was missing — used in reschedule actions

from core.throttles import BookingRateThrottle, AppointmentActionThrottle
from core.response import SuccessResponse, ErrorResponse
from core.pagination import StandardPagination
from core.workflows import BookingWorkflowOrchestrator, AppointmentWorkflowService
from core.exceptions import BusinessLogicException

from .models import Appointment
from .filters import AppointmentFilter
from .serializers import AppointmentSerializer, AppointmentListSerializer
from .permissions import (
    IsAppointmentParticipant,
    IsAppointmentDoctor,
    IsAppointmentManager,
)
from core.permissions.policies import AppointmentPolicy
from appointments.selectors import (
    get_appointments_for_patient,
    get_appointments_for_doctor,
    get_appointments_for_assistant,
    get_appointments_for_hospital_admin,
    get_all_appointments,
)


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    Full appointment management — role-scoped.

    GET    /api/v1/appointments/                → list (role-scoped)
    POST   /api/v1/appointments/                → create (patients only)
    GET    /api/v1/appointments/{id}/           → detail  (accepts int pk OR UUID public_id)
    POST   /api/v1/appointments/{id}/confirm/   → doctor or assistant
    POST   /api/v1/appointments/{id}/reject/    → doctor or assistant
    POST   /api/v1/appointments/{id}/cancel/    → patient, doctor, or assistant
    POST   /api/v1/appointments/{id}/complete/  → doctor only
    POST   /api/v1/appointments/{id}/reschedule/ → patient only
    """

    permission_classes  = [IsAuthenticated, IsAppointmentParticipant, AppointmentPolicy]
    pagination_class    = StandardPagination
    filter_backends     = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class     = AppointmentFilter   # date_from, date_to, today, status, clinic, hospital
    ordering_fields     = ['created_at', 'slot__start']
    ordering            = ['-created_at']
    throttle_classes    = [BookingRateThrottle]

    def get_object(self):
        """
        BUG-FIX #3: Accept both integer pk AND UUID public_id in the URL.
        Frontend may navigate to /appointments/{public_id} (UUID) from the
        dashboard, while the ViewSet default uses integer pk lookup.
        This override tries integer pk first, then falls back to public_id UUID.
        """
        from django.shortcuts import get_object_or_404
        queryset = self.filter_queryset(self.get_queryset())
        lookup_val = self.kwargs.get(self.lookup_field)

        try:
            # Try integer pk (canonical internal lookup)
            obj = get_object_or_404(queryset, pk=int(lookup_val))
        except (ValueError, TypeError):
            # lookup_val is not an integer → try UUID public_id lookup
            obj = get_object_or_404(queryset, public_id=lookup_val)

        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        user = self.request.user

        if getattr(user, 'is_patient', False):
            return get_appointments_for_patient(user)

        if getattr(user, 'is_doctor', False):
            return get_appointments_for_doctor(user)

        if getattr(user, 'is_assistant', False):
            try:
                ap = user.assistant_profile
            except Exception:
                return Appointment.objects.none()
            return get_appointments_for_assistant(ap)

        if getattr(user, 'hospital_admin', False):
            return get_appointments_for_hospital_admin(user)

        if getattr(user, 'is_platform_admin', False) or getattr(user, 'is_staff', False):
            return get_all_appointments()

        return Appointment.objects.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return AppointmentListSerializer
        return AppointmentSerializer

    # ------------------------------------------
    # Create — Patient only via BookingWorkflowOrchestrator
    # ------------------------------------------
    def create(self, request, *args, **kwargs):
        if not getattr(request.user, 'is_patient', False):
            return ErrorResponse(
                code="FORBIDDEN",
                message="Only patients can book appointments.",
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        workflow = BookingWorkflowOrchestrator(
            patient=request.user,
            doctor=vd['doctor'],
            slot_id=vd['slot'].id,
            reason=vd.get('reason'),
            visit_type=vd.get('visit_type'),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        appointment = workflow.execute()

        out = AppointmentSerializer(appointment, context={'request': request})
        return SuccessResponse(
            data=out.data,
            message="Booking request sent. Awaiting confirmation.",
            status=status.HTTP_201_CREATED,
        )

    # ------------------------------------------
    # Confirm — via AppointmentWorkflowService
    # ------------------------------------------
    # FIX B-09: AppointmentActionThrottle added — prevents state-change spam
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAppointmentManager],
            throttle_classes=[AppointmentActionThrottle])
    def confirm(self, request, pk=None):
        appointment = self.get_object()
        AppointmentWorkflowService.confirm(appointment, request.user)
        return SuccessResponse(
            data=AppointmentSerializer(appointment, context={'request': request}).data,
            message="Appointment confirmed.",
        )

    # ------------------------------------------
    # Reject — via AppointmentWorkflowService
    # ------------------------------------------
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAppointmentManager],
            throttle_classes=[AppointmentActionThrottle])
    def reject(self, request, pk=None):
        appointment = self.get_object()
        reason = request.data.get('reason', '')
        AppointmentWorkflowService.reject(appointment, request.user, reason=reason)
        return SuccessResponse(
            data=AppointmentSerializer(appointment, context={'request': request}).data,
            message="Appointment rejected.",
        )

    # ------------------------------------------
    # Cancel — via AppointmentWorkflowService
    # ------------------------------------------
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAppointmentParticipant],
            throttle_classes=[AppointmentActionThrottle])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        AppointmentWorkflowService.cancel(appointment, request.user)
        return SuccessResponse(
            data=AppointmentSerializer(appointment, context={'request': request}).data,
            message="Appointment cancelled.",
        )

    # ------------------------------------------
    # Complete — Doctor only
    # ------------------------------------------
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAppointmentDoctor],
            throttle_classes=[AppointmentActionThrottle])
    def complete(self, request, pk=None):
        appointment = self.get_object()
        AppointmentWorkflowService.complete(appointment, request.user)
        return SuccessResponse(
            data=AppointmentSerializer(appointment, context={'request': request}).data,
            message="Appointment marked as completed.",
        )

    @action(detail=True, methods=['post'], url_path='no-show',
            permission_classes=[IsAuthenticated, IsAppointmentDoctor])
    def no_show(self, request, pk=None):
        """
        POST /api/v1/appointments/{id}/no-show/
        FIX BUG-04: Doctor marks a CONFIRMED appointment as NO_SHOW.
        Patient did not attend — slot is freed for re-booking.
        """
        appointment = self.get_object()
        AppointmentWorkflowService.mark_no_show(appointment, request.user)
        return SuccessResponse(
            data=AppointmentSerializer(appointment, context={'request': request}).data,
            message="Appointment marked as no-show.",
        )

    # ------------------------------------------
    # Reschedule Request — Patient only
    # ------------------------------------------
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAppointmentParticipant])
    def reschedule(self, request, pk=None):
        """
        POST /api/v1/appointments/{id}/reschedule/
        Body: { "new_slot_id": <int>, "reason": "<str>" }

        Patient requests rescheduling. Appointment moves to RESCHEDULE_REQUESTED.
        The doctor/assistant must then call /approve-reschedule/ or /reject-reschedule/.
        """
        from django.core.exceptions import ValidationError as DjangoValidationError
        from .services import request_reschedule

        appointment = self.get_object()
        new_slot_id = request.data.get("new_slot_id")
        reason = request.data.get("reason", "").strip()

        # BUG-FIX #3: validate that at least one of reason/new_slot_id is present
        if not new_slot_id and not reason:
            return ErrorResponse(
                code="VALIDATION_ERROR",
                message="يجب تقديم سبب إعادة الجدولة أو تحديد موعد جديد على الأقل.",
                status=status.HTTP_400_BAD_REQUEST,
            )

        # FIX: new_slot_id is optional — patient can request reschedule with only a reason.
        # If new_slot_id provided, use full reschedule flow. Otherwise just set status + reason.
        try:
            if new_slot_id:
                updated = request_reschedule(
                    appointment=appointment,
                    patient=request.user,
                    new_slot_id=int(new_slot_id),
                    reason=reason,
                )
            else:
                from .services import request_reschedule_reason_only
                updated = request_reschedule_reason_only(
                    appointment=appointment,
                    patient=request.user,
                    reason=reason,
                )
        except PermissionDenied as e:
            return ErrorResponse(code="FORBIDDEN", message=str(e), status=status.HTTP_403_FORBIDDEN)
        except DjangoValidationError as e:
            return ErrorResponse(code="VALIDATION_ERROR", message=" ".join(e.messages), status=status.HTTP_400_BAD_REQUEST)

        return SuccessResponse(
            data=AppointmentSerializer(updated, context={'request': request}).data,
            message="Reschedule request sent. Awaiting doctor approval.",
            status=status.HTTP_200_OK,
        )

    # ------------------------------------------
    # Approve Reschedule — Doctor/Assistant
    # ------------------------------------------
    @action(detail=True, methods=['post'], url_path='approve-reschedule',
            permission_classes=[IsAuthenticated, IsAppointmentManager])
    def approve_reschedule(self, request, pk=None):
        """
        POST /api/v1/appointments/{id}/approve-reschedule/
        Doctor or Assistant approves the reschedule request.
        """
        from django.core.exceptions import ValidationError as DjangoValidationError
        from .services import approve_reschedule

        appointment = self.get_object()

        try:
            updated = approve_reschedule(appointment=appointment, user=request.user)
        except PermissionDenied as e:
            return ErrorResponse(code="FORBIDDEN", message=str(e), status=status.HTTP_403_FORBIDDEN)
        except DjangoValidationError as e:
            return ErrorResponse(code="VALIDATION_ERROR", message=" ".join(e.messages), status=status.HTTP_400_BAD_REQUEST)

        return SuccessResponse(
            data=AppointmentSerializer(updated, context={'request': request}).data,
            message="Reschedule approved.",
        )

    # ------------------------------------------
    # Reject Reschedule — Doctor/Assistant
    # ------------------------------------------
    @action(detail=True, methods=['post'], url_path='reject-reschedule',
            permission_classes=[IsAuthenticated, IsAppointmentManager])
    def reject_reschedule(self, request, pk=None):
        """
        POST /api/v1/appointments/{id}/reject-reschedule/
        Body: { "reason": "<str>" }
        Doctor or Assistant rejects the reschedule request. Appointment reverts to CONFIRMED.
        """
        from django.core.exceptions import ValidationError as DjangoValidationError
        from .services import reject_reschedule

        appointment = self.get_object()
        reason = request.data.get("reason", "")

        try:
            updated = reject_reschedule(appointment=appointment, user=request.user, reason=reason)
        except PermissionDenied as e:
            return ErrorResponse(code="FORBIDDEN", message=str(e), status=status.HTTP_403_FORBIDDEN)
        except DjangoValidationError as e:
            return ErrorResponse(code="VALIDATION_ERROR", message=" ".join(e.messages), status=status.HTTP_400_BAD_REQUEST)

        return SuccessResponse(
            data=AppointmentSerializer(updated, context={'request': request}).data,
            message="Reschedule request rejected.",
        )

    # ------------------------------------------
    # Status Update — Hospital Admin (Bug #7 Fix)
    # ------------------------------------------
    @action(
        detail=True,
        methods=['patch'],
        url_path='status',
        permission_classes=[IsAuthenticated, IsAppointmentManager],
        throttle_classes=[AppointmentActionThrottle],
    )
    def status_update(self, request, pk=None):
        """
        PATCH /api/v1/appointments/{id}/status/
        Body: { "status": "confirmed" | "rejected" | "pending" }

        Bug #7 Fix: Hospital admin needs to confirm/reject appointments from the
        dashboard table. This endpoint routes to the correct workflow action based
        on the requested status value.

        Allowed transitions (hospital_admin):
          pending   → confirmed  (via confirm action)
          pending   → rejected   (via reject action)
          confirmed → pending    (via cancel action — reverts to cancellable state)
        """
        appointment = self.get_object()
        new_status = request.data.get('status', '').lower().strip()

        VALID = {'confirmed', 'rejected', 'pending', 'cancelled'}
        if new_status not in VALID:
            return ErrorResponse(
                code="VALIDATION_ERROR",
                message=f'الحالة "{new_status}" غير صالحة. الحالات المقبولة: {", ".join(VALID)}',
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if new_status == 'confirmed':
                AppointmentWorkflowService.confirm(appointment, request.user)
                msg = "Appointment confirmed."
            elif new_status == 'rejected':
                reason = request.data.get('reason', '')
                AppointmentWorkflowService.reject(appointment, request.user, reason=reason)
                msg = "Appointment rejected."
            elif new_status == 'pending':
                # Bug #7 Fix: "تحويل لانتظار" — revert confirmed → pending (not cancel)
                # The slot remains booked; appointment stays active for re-review.
                AppointmentWorkflowService.revert_to_pending(appointment, request.user)
                msg = "Appointment reverted to pending."
            elif new_status == 'cancelled':
                AppointmentWorkflowService.cancel(appointment, request.user)
                msg = "Appointment cancelled."
            else:
                return ErrorResponse(
                    code="VALIDATION_ERROR",
                    message=f'لا يمكن تحويل الموعد إلى الحالة "{new_status}".',
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            return ErrorResponse(
                code="WORKFLOW_ERROR",
                message=str(e),
                status=status.HTTP_400_BAD_REQUEST,
            )

        return SuccessResponse(
            data=AppointmentSerializer(appointment, context={'request': request}).data,
            message=msg,
        )

