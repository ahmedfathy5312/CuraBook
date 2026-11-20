import pytest
from rest_framework.test import APIClient, APIRequestFactory

from appointments.permissions import IsAppointmentManager
from reports.models import Report
from tests.factories import (
    AssistantUserFactory,
    ClinicAssistantFactory,
    ClinicFactory,
    DoctorUserFactory,
    PatientUserFactory,
)


def unwrap(data):
    payload = data.get('data', data) if isinstance(data, dict) else data
    return payload.get('results', payload) if isinstance(payload, dict) else payload


@pytest.mark.django_db
def test_visible_report_without_uploaded_file_has_viewable_pdf():
    patient = PatientUserFactory()
    report = Report.objects.create(
        user=patient,
        type='MEDICAL_HISTORY',
        name='Medical history summary',
        doctor_name='Dr Test',
    )
    client = APIClient()
    client.force_authenticate(patient)

    listed = client.get('/api/v1/reports/')
    assert listed.status_code == 200
    item = unwrap(listed.data)[0]
    assert item['view_url'] == f'/reports/{report.id}/content/'
    assert '/api/v1/api/v1/' not in item['view_url']

    opened = client.get('/api/v1' + item['view_url'])
    assert opened.status_code == 200
    assert opened['Content-Type'] == 'application/pdf'
    assert next(iter(opened.streaming_content)).startswith(b'%PDF')


@pytest.mark.django_db
def test_doctor_can_save_and_reload_assistant_permissions():
    doctor_user = DoctorUserFactory()
    doctor = doctor_user.doctor_profile
    clinic = ClinicFactory(owner=doctor)
    assistant_user = AssistantUserFactory()
    assistant = assistant_user.assistant_profile
    ClinicAssistantFactory(clinic=clinic, assistant=assistant)
    client = APIClient()
    client.force_authenticate(doctor_user)

    permissions = {
        'manage_appointments': False,
        'view_patient_records': False,
        'edit_patient_records': True,
        'write_prescriptions': True,
        'message_patients': False,
        'view_financial': True,
        'edit_schedule': True,
    }
    response = client.patch(
        f'/api/v1/doctor/assistants/{assistant.id}/',
        {'permissions': permissions},
        format='json',
    )
    assert response.status_code == 200
    assert unwrap(response.data)['permissions'] == permissions

    assistant.refresh_from_db()
    assert assistant.effective_permissions() == permissions
    assert assistant.can_manage_appointments is False
    assert assistant.can_edit_schedule is True
    assert assistant.can_upload_documents is True

    listed = client.get('/api/v1/doctor/assistants/')
    assert listed.status_code == 200
    saved = next(item for item in unwrap(listed.data) if item['id'] == assistant.id)
    assert saved['permissions'] == permissions


@pytest.mark.django_db
def test_manage_appointments_permission_is_enforced():
    assistant_user = AssistantUserFactory()
    assistant = assistant_user.assistant_profile
    request = APIRequestFactory().post('/api/v1/appointments/1/confirm/')
    request.user = assistant_user

    assistant.update_permissions({'manage_appointments': False})
    assert IsAppointmentManager().has_permission(request, object()) is False

    assistant.update_permissions({'manage_appointments': True})
    assert IsAppointmentManager().has_permission(request, object()) is True