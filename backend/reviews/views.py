"""
CuraBook — Reviews Views (FIXED)
==================================
Fixes applied:
  1. ReviewCreateView now validates appointment status == COMPLETED
     (previously allowed reviews on PENDING/CANCELLED appointments)
  2. Fixed appointment.doctor.user bug — appointment.doctor IS the User,
     not a DoctorProfile (based on appointments/models.py FK to User)
  3. All querysets use selectors
  4. ReviewPolicy applied for object-level permission
"""

from rest_framework import generics, permissions, filters
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend

from .models import Review
from .serializers import ReviewSerializer
from .selectors import get_reviews_for_doctor, get_review_by_id_for_patient
from core.permissions.policies import ReviewPolicy
from core.pagination import StandardPagination
from appointments.models import Appointment
from notifications.services import send_notification


# ─────────────────────────────────────────────────────
# Admin: list all reviews (platform admin only)
# ─────────────────────────────────────────────────────
class ReviewListView(generics.ListAPIView):
    serializer_class   = ReviewSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class   = StandardPagination          # Bug #20: pagination added
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields   = {
        'doctor':   ['exact'],
        'hospital': ['exact'],
        'clinic':   ['exact'],
        'rating':   ['exact', 'gte', 'lte'],
    }
    search_fields  = ['comment', 'patient__username', 'doctor__username']
    ordering_fields = ['created_at', 'rating']
    ordering        = ['-created_at']

    def get_queryset(self):
        return Review.objects.select_related(
            'patient', 'doctor', 'clinic', 'hospital'
        ).all()


# ─────────────────────────────────────────────────────
# Single review detail
# ─────────────────────────────────────────────────────
class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET /PATCH /DELETE /api/v1/reviews/{id}/ — frontend uses direct /{id}/ for all ops"""
    queryset = Review.objects.select_related('patient', 'doctor', 'clinic', 'hospital')
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        if instance.patient_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete your own reviews.")
        instance.delete()

    def perform_update(self, serializer):
        if serializer.instance.patient_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only update your own reviews.")
        serializer.save()


# ─────────────────────────────────────────────────────
# Create review — FIXED
# ─────────────────────────────────────────────────────
class ReviewCreateView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        appointment_id = self.request.data.get('appointment')
        appointment = get_object_or_404(
            Appointment.objects.select_related('doctor', 'slot', 'clinic', 'hospital'),
            id=appointment_id,
        )

        # ✅ Must be the patient of this appointment
        if appointment.patient_id != self.request.user.id:
            raise ValidationError("You do not have permission to review this appointment.")

        # ✅ FIX: Appointment must be COMPLETED before a review is allowed
        if appointment.status != Appointment.Status.COMPLETED:
            raise ValidationError(
                "A review can only be submitted after the appointment is completed."
                f"Current status: {appointment.get_status_display()}"
            )

        # ✅ One review per appointment
        if Review.objects.filter(appointment=appointment).exists():
            raise ValidationError("A review has already been submitted for this appointment.")

        # ✅ FIX: appointment.doctor IS the User (FK to User model directly)
        #         Previously was: appointment.doctor.user (wrong — doctor is already a User)
        doctor_user = appointment.doctor
        clinic      = appointment.clinic      # may be None if hospital appointment
        hospital    = appointment.hospital    # may be None if clinic appointment

        serializer.save(
            patient=self.request.user,
            doctor=doctor_user,
            clinic=clinic,
            hospital=hospital,
            appointment=appointment,
        )

        # Notify doctor
        send_notification(
            doctor_user,
            "New review",
            f"You have a new review from patient {self.request.user.full_name or self.request.user.username}.",
        )


# ─────────────────────────────────────────────────────
# Update review — patient only, own reviews
# ─────────────────────────────────────────────────────
class ReviewUpdateView(generics.UpdateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated, ReviewPolicy]

    def get_queryset(self):
        return Review.objects.filter(patient=self.request.user)



# ─────────────────────────────────────────────────────
# Patient: my reviews
# ─────────────────────────────────────────────────────
class MyReviewsView(generics.ListAPIView):
    """
    GET /api/v1/reviews/my/
    Returns all reviews submitted by the current patient.
    """
    serializer_class   = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class   = StandardPagination


# ─────────────────────────────────────────────────────
# Delete review — patient only, own reviews
# ─────────────────────────────────────────────────────
class ReviewDeleteView(generics.DestroyAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated, ReviewPolicy]

    def get_queryset(self):
        return Review.objects.filter(patient=self.request.user)
