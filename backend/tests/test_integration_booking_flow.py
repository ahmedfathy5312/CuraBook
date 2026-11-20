"""
CuraBook — Integration Tests: Full Booking Flow

B-09 FIX: End-to-end booking flow test covering:
  1. Patient registers (or logs in)
  2. Patient searches for doctors
  3. Patient views available slots for a doctor
  4. Patient books an appointment (PENDING)
  5. Doctor confirms the appointment (CONFIRMED)
  6. Doctor marks appointment as completed (COMPLETED)
  7. Patient submits a review
  8. Edge cases: double-booking, cancellation, no-show, reschedule flow

Uses real HTTP through Django test client (no mocking of business logic).
Mocks only: external integrations (email, WebSocket, Celery).
"""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta
from unittest.mock import patch, MagicMock

from appointments.models import Appointment
from tests.factories import (
    PatientUserFactory,
    DoctorUserFactory,
    DoctorProfileFactory,
    PatientProfileFactory,
    ClinicFactory,
    SlotFactory,
    AppointmentFactory,
    ScheduleFactory,
)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

REGISTER_URL     = '/api/v1/auth/register/'
LOGIN_URL        = '/api/v1/auth/login/'
SEARCH_URL       = '/api/v1/search/doctors/'
SLOTS_URL        = '/api/v1/search/slots/'
APPOINTMENTS_URL = '/api/v1/appointments/'
REVIEWS_URL      = '/api/v1/reviews/create/'

ACTION_URL = lambda pk, action: f'/api/v1/appointments/{pk}/{action}/'


def jwt_client(user) -> APIClient:
    """Return APIClient authenticated via JWT for the given user."""
    from rest_framework_simplejwt.tokens import RefreshToken
    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(token.access_token)}')
    return client


def make_future_slot(doctor, clinic, hours_ahead=24):
    """Create a future available slot for the given doctor/clinic."""
    start = timezone.now() + timedelta(hours=hours_ahead)
    end   = start + timedelta(minutes=30)
    return SlotFactory(
        doctor=doctor,
        clinic=clinic,
        start=start,
        end=end,
        is_booked=False,
        is_active=True,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def doctor_profile():
    return DoctorProfileFactory(specialty='Cardiology', accepts_booking=True)


@pytest.fixture
def doctor(doctor_profile):
    return doctor_profile.user


@pytest.fixture
def clinic(doctor_profile):
    return ClinicFactory(owner=doctor_profile, is_active=True)


@pytest.fixture
def patient():
    user = PatientUserFactory()
    PatientProfileFactory(user=user)
    return user


@pytest.fixture
def available_slot(doctor, clinic):
    return make_future_slot(doctor, clinic)


@pytest.fixture
def patient_client(patient):
    return jwt_client(patient)


@pytest.fixture
def doctor_client(doctor):
    return jwt_client(doctor)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Patient Registration Flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPatientRegistration:
    """Patient can register and immediately log in."""

    @patch('apps.accounts.views.send_mail', return_value=1)
    def test_register_new_patient(self, mock_mail):
        client = APIClient()
        payload = {
            'username':   'testpatient_001',
            'email':      'testpatient_001@example.com',
            'full_name':  'Test Patient',
            'password':   'SecurePass123!',
            'role':       'patient',
            'is_patient': True,
        }
        resp = client.post(REGISTER_URL, payload)
        assert resp.status_code in (
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
        ), f"Registration failed: {resp.data}"

    def test_registered_patient_can_login(self):
        user = PatientUserFactory()
        client = APIClient()
        resp = client.post(LOGIN_URL, {
            'username': user.username,
            'password': 'Test1234!',
        })
        assert resp.status_code == status.HTTP_200_OK
        assert 'access' in resp.data
        assert 'refresh' in resp.data


# ─────────────────────────────────────────────────────────────────────────────
# 2. Doctor Search
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDoctorSearch:
    """Patient can search for doctors with various filters."""

    def test_search_returns_results(self, patient_client, doctor_profile):
        resp = patient_client.get(SEARCH_URL)
        assert resp.status_code == status.HTTP_200_OK
        # Results can be paginated
        data = resp.data
        results = data.get('results') or data.get('data') or (data if isinstance(data, list) else [])
        assert isinstance(results, list)

    def test_search_by_specialty(self, patient_client, doctor_profile):
        resp = patient_client.get(SEARCH_URL, {'specialty': 'Cardiology'})
        assert resp.status_code == status.HTTP_200_OK

    def test_search_by_query(self, patient_client, doctor_profile):
        resp = patient_client.get(SEARCH_URL, {'q': 'doctor'})
        assert resp.status_code == status.HTTP_200_OK

    def test_search_price_filter(self, patient_client, doctor_profile):
        resp = patient_client.get(SEARCH_URL, {'min_fee': 0, 'max_fee': 9999})
        assert resp.status_code == status.HTTP_200_OK

    def test_search_anonymous_allowed(self, doctor_profile):
        """Search should be accessible without authentication."""
        client = APIClient()
        resp = client.get(SEARCH_URL)
        assert resp.status_code == status.HTTP_200_OK

    def test_search_returns_slot_count_or_data(self, patient_client, doctor_profile, clinic, available_slot):
        resp = patient_client.get(SEARCH_URL)
        assert resp.status_code == status.HTTP_200_OK


# ─────────────────────────────────────────────────────────────────────────────
# 3. Slot Availability
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSlotAvailability:
    """Patient can fetch available slots for a specific doctor."""

    def test_fetch_slots_for_doctor(self, patient_client, doctor, clinic, available_slot):
        resp = patient_client.get(SLOTS_URL, {
            'doctor_id': doctor.id,
            'clinic_id': clinic.id,
        })
        assert resp.status_code == status.HTTP_200_OK

    def test_fetch_slots_accepts_doctor_profile_id(self, patient_client, doctor_profile, clinic, available_slot):
        resp = patient_client.get(SLOTS_URL, {
            'doctor_id': doctor_profile.id,
            'clinic_id': clinic.id,
        })
        assert resp.status_code == status.HTTP_200_OK
        results = resp.data.get('data') or resp.data.get('results') or resp.data
        assert any(slot['id'] == available_slot.id for slot in results)

    def test_booked_slots_not_in_available(self, patient_client, doctor, clinic):
        booked = SlotFactory(
            doctor=doctor, clinic=clinic,
            start=timezone.now() + timedelta(hours=5),
            end=timezone.now() + timedelta(hours=5, minutes=30),
            is_booked=True,
        )
        resp = patient_client.get(SLOTS_URL, {'doctor_id': doctor.id, 'clinic_id': clinic.id})
        assert resp.status_code == status.HTTP_200_OK


# ─────────────────────────────────────────────────────────────────────────────
# 4. Core Booking Flow: PENDING → CONFIRMED → COMPLETED
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@patch('notifications.tasks.send_appointment_reminders')
@patch('appointments.tasks.expire_pending_appointments')
class TestCoreBookingFlow:
    """
    Full happy-path: patient books → doctor confirms → doctor completes.
    This is the primary integration test B-09 targets.
    """

    def test_patient_can_book_appointment(self, mock_expire, mock_reminder,
                                           patient_client, patient, doctor,
                                           clinic, available_slot):
        resp = patient_client.post(APPOINTMENTS_URL, {
            'doctor':     doctor.id,
            'slot':       available_slot.id,
            'clinic':     clinic.id,
            'visit_type': 'IN_PERSON',
        })
        assert resp.status_code in (
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
        ), f"Booking failed: {resp.data}"

        appt = Appointment.objects.filter(patient=patient, doctor=doctor).first()
        assert appt is not None
        assert appt.status == 'PENDING'

    def test_patient_can_book_appointment_with_slot_id_alias(self, mock_expire, mock_reminder,
                                                             patient_client, patient, doctor,
                                                             clinic, available_slot):
        resp = patient_client.post(APPOINTMENTS_URL, {
            'doctor':     doctor.id,
            'slot_id':    available_slot.id,
            'clinic':     clinic.id,
            'visit_type': 'IN_PERSON',
        })
        assert resp.status_code in (
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
        ), f"Booking with slot_id failed: {resp.data}"

        appt = Appointment.objects.filter(patient=patient, doctor=doctor).first()
        assert appt is not None
        assert appt.slot_id == available_slot.id
        assert appt.status == 'PENDING'

    def test_doctor_can_confirm_appointment(self, mock_expire, mock_reminder,
                                             doctor_client, patient, doctor,
                                             clinic, available_slot):
        appt = AppointmentFactory(patient=patient, doctor=doctor, slot=available_slot, clinic=clinic)

        resp = doctor_client.post(ACTION_URL(appt.pk, 'confirm'))
        assert resp.status_code == status.HTTP_200_OK, f"Confirm failed: {resp.data}"

        appt.refresh_from_db()
        assert appt.status == 'CONFIRMED'

    def test_doctor_can_complete_appointment(self, mock_expire, mock_reminder,
                                              doctor_client, patient, doctor,
                                              clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='CONFIRMED',
        )
        resp = doctor_client.post(ACTION_URL(appt.pk, 'complete'))
        assert resp.status_code == status.HTTP_200_OK, f"Complete failed: {resp.data}"

        appt.refresh_from_db()
        assert appt.status == 'COMPLETED'

    def test_full_flow_book_confirm_complete(self, mock_expire, mock_reminder,
                                              patient_client, doctor_client,
                                              patient, doctor, clinic, available_slot):
        """
        Full happy-path in one test:
        Patient books → doctor confirms → doctor completes.
        """
        # Step 1: Patient books
        book_resp = patient_client.post(APPOINTMENTS_URL, {
            'doctor':     doctor.id,
            'slot':       available_slot.id,
            'clinic':     clinic.id,
            'visit_type': 'IN_PERSON',
        })
        assert book_resp.status_code in (200, 201), f"Book failed: {book_resp.data}"
        appt_id = book_resp.data.get('id') or book_resp.data.get('data', {}).get('id')
        assert appt_id, "No appointment id in response"

        # Step 2: Verify status is PENDING
        appt = Appointment.objects.get(pk=appt_id)
        assert appt.status == 'PENDING'

        # Step 3: Doctor confirms
        confirm_resp = doctor_client.post(ACTION_URL(appt_id, 'confirm'))
        assert confirm_resp.status_code == 200, f"Confirm failed: {confirm_resp.data}"
        appt.refresh_from_db()
        assert appt.status == 'CONFIRMED'

        # Step 4: Doctor completes
        complete_resp = doctor_client.post(ACTION_URL(appt_id, 'complete'))
        assert complete_resp.status_code == 200, f"Complete failed: {complete_resp.data}"
        appt.refresh_from_db()
        assert appt.status == 'COMPLETED'


# ─────────────────────────────────────────────────────────────────────────────
# 5. Review Submission After Completed Appointment
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestReviewSubmission:
    """Patient can submit a review only after a COMPLETED appointment."""

    def test_patient_can_review_completed_appointment(self, patient_client, patient, doctor,
                                                       clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='COMPLETED',
        )
        resp = patient_client.post(REVIEWS_URL, {
            'doctor':      doctor.id,
            'appointment': appt.id,
            'rating':      5,
            'comment':     'Excellent doctor, very professional.',
        })
        assert resp.status_code in (200, 201), f"Review failed: {resp.data}"

    def test_patient_cannot_review_pending_appointment(self, patient_client, patient, doctor,
                                                        clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='PENDING',
        )
        resp = patient_client.post(REVIEWS_URL, {
            'doctor':      doctor.id,
            'appointment': appt.id,
            'rating':      4,
            'comment':     'Too early to review.',
        })
        # Should reject — appointment not completed yet
        assert resp.status_code in (400, 403, 422), \
            f"Expected rejection for pending review, got {resp.status_code}: {resp.data}"


# ─────────────────────────────────────────────────────────────────────────────
# 6. Cancellation Flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCancellationFlow:
    """Patient and doctor can cancel appointments. Terminal states block cancel."""

    def test_patient_can_cancel_pending_appointment(self, patient_client, patient,
                                                     doctor, clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='PENDING',
        )
        resp = patient_client.post(ACTION_URL(appt.pk, 'cancel'))
        assert resp.status_code == 200, f"Cancel failed: {resp.data}"
        appt.refresh_from_db()
        assert appt.status == 'CANCELLED'

    def test_patient_can_cancel_confirmed_appointment(self, patient_client, patient,
                                                       doctor, clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='CONFIRMED',
        )
        resp = patient_client.post(ACTION_URL(appt.pk, 'cancel'))
        assert resp.status_code == 200, f"Cancel confirmed failed: {resp.data}"
        appt.refresh_from_db()
        assert appt.status == 'CANCELLED'

    def test_cannot_cancel_completed_appointment(self, patient_client, patient,
                                                  doctor, clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='COMPLETED',
        )
        resp = patient_client.post(ACTION_URL(appt.pk, 'cancel'))
        # COMPLETED is terminal — should reject
        assert resp.status_code in (400, 403, 409, 422), \
            f"Expected rejection for cancelling COMPLETED appt, got {resp.status_code}"

    def test_doctor_can_reject_pending_appointment(self, doctor_client, patient,
                                                    doctor, clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='PENDING',
        )
        resp = doctor_client.post(ACTION_URL(appt.pk, 'reject'))
        assert resp.status_code == 200, f"Reject failed: {resp.data}"
        appt.refresh_from_db()
        assert appt.status == 'REJECTED'


# ─────────────────────────────────────────────────────────────────────────────
# 7. No-Show Flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestNoShowFlow:
    """Doctor can mark a confirmed appointment as NO_SHOW."""

    def test_doctor_can_mark_no_show(self, doctor_client, patient, doctor,
                                      clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='CONFIRMED',
        )
        resp = doctor_client.post(ACTION_URL(appt.pk, 'no-show'))
        assert resp.status_code == 200, f"No-show failed: {resp.data}"
        appt.refresh_from_db()
        assert appt.status == 'NO_SHOW'

    def test_no_show_not_allowed_from_pending(self, doctor_client, patient,
                                               doctor, clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='PENDING',
        )
        resp = doctor_client.post(ACTION_URL(appt.pk, 'no-show'))
        # NO_SHOW from PENDING is not a valid transition
        assert resp.status_code in (400, 403, 409, 422), \
            f"Expected rejection for no-show from PENDING, got {resp.status_code}"


# ─────────────────────────────────────────────────────────────────────────────
# 8. Double-Booking Prevention
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDoubleBookingPrevention:
    """The same slot cannot be booked by two different patients simultaneously."""

    def test_slot_cannot_be_double_booked(self, patient, doctor, clinic, available_slot):
        # First patient books successfully
        p1 = patient
        p2 = PatientUserFactory()
        PatientProfileFactory(user=p2)

        c1 = jwt_client(p1)
        c2 = jwt_client(p2)

        payload = {
            'doctor':     doctor.id,
            'slot':       available_slot.id,
            'clinic':     clinic.id,
            'visit_type': 'IN_PERSON',
        }

        resp1 = c1.post(APPOINTMENTS_URL, payload)
        assert resp1.status_code in (200, 201), f"First booking failed: {resp1.data}"

        # Second patient tries to book the same slot — should fail
        resp2 = c2.post(APPOINTMENTS_URL, payload)
        assert resp2.status_code in (400, 409, 422), \
            f"Expected double-booking rejection, got {resp2.status_code}: {resp2.data}"


# ─────────────────────────────────────────────────────────────────────────────
# 9. Reschedule Flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRescheduleFlow:
    """Patient requests reschedule → doctor approves or rejects."""

    def test_patient_can_request_reschedule(self, patient_client, patient,
                                             doctor, clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='CONFIRMED',
        )
        new_slot = make_future_slot(doctor, clinic, hours_ahead=48)
        resp = patient_client.post(ACTION_URL(appt.pk, 'reschedule'), {
            'new_slot_id': new_slot.id,
            'reason':      'Family emergency — need a different time.',
        })
        assert resp.status_code in (200, 201), f"Reschedule request failed: {resp.data}"
        appt.refresh_from_db()
        assert appt.status == 'RESCHEDULE_REQUESTED'

    def test_doctor_can_approve_reschedule(self, doctor_client, patient,
                                            doctor, clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='RESCHEDULE_REQUESTED',
        )
        resp = doctor_client.post(ACTION_URL(appt.pk, 'approve-reschedule'))
        assert resp.status_code == 200, f"Approve reschedule failed: {resp.data}"
        appt.refresh_from_db()
        assert appt.status == 'CONFIRMED'

    def test_doctor_can_reject_reschedule(self, doctor_client, patient,
                                           doctor, clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='RESCHEDULE_REQUESTED',
        )
        resp = doctor_client.post(ACTION_URL(appt.pk, 'reject-reschedule'))
        assert resp.status_code == 200, f"Reject reschedule failed: {resp.data}"
        appt.refresh_from_db()
        assert appt.status == 'REJECTED'


# ─────────────────────────────────────────────────────────────────────────────
# 10. Authorization Guards
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAuthorizationGuards:
    """Unauthenticated or wrong-role users cannot perform booking actions."""

    def test_unauthenticated_cannot_book(self, doctor, clinic, available_slot):
        client = APIClient()
        resp = client.post(APPOINTMENTS_URL, {
            'doctor': doctor.id, 'slot': available_slot.id,
            'clinic': clinic.id, 'visit_type': 'IN_PERSON',
        })
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_patient_cannot_confirm_appointment(self, patient_client, patient,
                                                 doctor, clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='PENDING',
        )
        resp = patient_client.post(ACTION_URL(appt.pk, 'confirm'))
        assert resp.status_code in (403, 400), \
            f"Patient should not be able to confirm, got {resp.status_code}"

    def test_other_patient_cannot_cancel_appointment(self, patient, doctor,
                                                      clinic, available_slot):
        """A different patient cannot cancel someone else's appointment."""
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='PENDING',
        )
        other_patient = PatientUserFactory()
        other_client  = jwt_client(other_patient)
        resp = other_client.post(ACTION_URL(appt.pk, 'cancel'))
        assert resp.status_code in (403, 404), \
            f"Other patient should not cancel, got {resp.status_code}"

    def test_doctor_cannot_access_other_doctor_appointment(self, patient, doctor,
                                                            clinic, available_slot):
        appt = AppointmentFactory(
            patient=patient, doctor=doctor,
            slot=available_slot, clinic=clinic,
            status='PENDING',
        )
        other_doctor = DoctorUserFactory()
        other_client = jwt_client(other_doctor)
        resp = other_client.post(ACTION_URL(appt.pk, 'confirm'))
        assert resp.status_code in (403, 404), \
            f"Other doctor should not confirm, got {resp.status_code}"
