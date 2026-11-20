import pytest
from rest_framework.test import APIClient

from appointments.models import Appointment
from tests.factories import (
    AppointmentFactory,
    AssistantUserFactory,
    ClinicAssistantFactory,
    ClinicFactory,
    DoctorUserFactory,
    PatientUserFactory,
    SlotFactory,
)
from video.models import VideoSession
from video.serializers import VideoSessionSerializer


@pytest.mark.django_db
def test_doctor_can_disable_and_reenable_assistant_and_list_preserves_state():
    doctor_user = DoctorUserFactory()
    clinic = ClinicFactory(owner=doctor_user.doctor_profile)
    assistant_user = AssistantUserFactory()
    assistant = assistant_user.assistant_profile
    assignment = ClinicAssistantFactory(clinic=clinic, assistant=assistant, is_active=True)
    client = APIClient()
    client.force_authenticate(doctor_user)

    disabled = client.patch(
        f'/api/v1/doctor/assistants/{assistant.id}/',
        {'is_active': False},
        format='json',
    )
    assert disabled.status_code == 200
    assert disabled.data['is_active'] is False
    assignment.refresh_from_db()
    assert assignment.is_active is False

    listed = client.get('/api/v1/doctor/assistants/')
    saved = next(item for item in listed.data if item['id'] == assistant.id)
    assert saved['is_active'] is False

    enabled = client.patch(
        f'/api/v1/doctor/assistants/{assistant.id}/',
        {'is_active': True},
        format='json',
    )
    assert enabled.status_code == 200
    assert enabled.data['is_active'] is True


@pytest.mark.django_db
def test_video_session_exposes_both_participant_names_for_role_specific_copy():
    doctor = DoctorUserFactory(full_name='Dr Video')
    patient = PatientUserFactory(full_name='Patient Video')
    clinic = ClinicFactory(owner=doctor.doctor_profile)
    slot = SlotFactory(doctor=doctor, clinic=clinic)
    appointment = AppointmentFactory(
        doctor=doctor,
        patient=patient,
        slot=slot,
        clinic=clinic,
        status=Appointment.Status.CONFIRMED,
        visit_type=Appointment.VisitType.ONLINE,
    )
    session, _ = VideoSession.objects.get_or_create(appointment=appointment)

    data = VideoSessionSerializer(session).data
    assert data['doctor_name'] == 'Dr Video'
    assert data['patient_name'] == 'Patient Video'
    assert data['scheduled_time'] is not None


@pytest.mark.django_db
def test_doctor_can_create_video_session_from_confirmed_online_appointment():
    doctor = DoctorUserFactory()
    patient = PatientUserFactory()
    clinic = ClinicFactory(owner=doctor.doctor_profile)
    slot = SlotFactory(doctor=doctor, clinic=clinic)
    appointment = AppointmentFactory(
        doctor=doctor,
        patient=patient,
        slot=slot,
        clinic=clinic,
        status=Appointment.Status.CONFIRMED,
        visit_type=Appointment.VisitType.ONLINE,
    )
    client = APIClient()
    client.force_authenticate(doctor)

    created = client.post(
        '/api/v1/video/sessions/',
        {'appointment_id': appointment.id},
        format='json',
    )
    assert created.status_code == 201
    assert created.data['appointment'] == appointment.id

    repeated = client.post(
        '/api/v1/video/sessions/',
        {'appointment_id': appointment.id},
        format='json',
    )
    assert repeated.status_code == 201
    assert repeated.data['id'] == created.data['id']
