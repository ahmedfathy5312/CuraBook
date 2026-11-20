import pytest
from django.utils import timezone
from datetime import timedelta

from appointments.serializers import AppointmentSerializer
from appointments.models import Appointment
from hospital.models import HospitalDoctor
from notifications.models import Notification
from search.selectors import get_doctor_search_queryset
from search.serializers import DoctorSearchSerializer
from search.services import _serialize_doctor_profile
from tests.factories import (
    ClinicFactory,
    DoctorProfileFactory,
    HospitalFactory,
    PatientUserFactory,
    SlotFactory,
)


@pytest.mark.django_db
def test_doctor_search_serializer_uses_owned_active_clinic():
    profile = DoctorProfileFactory()
    clinic = ClinicFactory(owner=profile, name="Owned Clinic")

    data = DoctorSearchSerializer(profile).data

    assert data["clinic_id"] == clinic.id
    assert data["clinic_name"] == "Owned Clinic"


@pytest.mark.django_db
def test_cached_doctor_serialization_includes_clinic_and_hospital_location():
    profile = DoctorProfileFactory()
    clinic = ClinicFactory(owner=profile, name="Cache Clinic")
    hospital = HospitalFactory(name="Cache Hospital")
    HospitalDoctor.objects.create(user=profile.user, hospital=hospital, is_active=True)

    data = _serialize_doctor_profile(profile)

    assert data["clinic_id"] == clinic.id
    assert data["clinic_name"] == "Cache Clinic"
    assert data["hospital_id"] == hospital.id
    assert data["hospital_name"] == "Cache Hospital"


@pytest.mark.django_db
def test_general_doctor_search_excludes_hospital_only_doctors():
    private_profile = DoctorProfileFactory()
    ClinicFactory(owner=private_profile)

    hospital_only_profile = DoctorProfileFactory()
    hospital = HospitalFactory()
    HospitalDoctor.objects.create(
        user=hospital_only_profile.user,
        hospital=hospital,
        is_active=True,
    )

    ids = set(get_doctor_search_queryset().values_list("id", flat=True))

    assert private_profile.id in ids
    assert hospital_only_profile.id not in ids


@pytest.mark.django_db
def test_hospital_doctor_search_returns_only_linked_hospital_doctors():
    hospital = HospitalFactory()
    other_hospital = HospitalFactory()
    linked_profile = DoctorProfileFactory()
    other_profile = DoctorProfileFactory()
    HospitalDoctor.objects.create(user=linked_profile.user, hospital=hospital, is_active=True)
    HospitalDoctor.objects.create(user=other_profile.user, hospital=other_hospital, is_active=True)

    ids = set(get_doctor_search_queryset(hospital_id=hospital.id).values_list("id", flat=True))

    assert linked_profile.id in ids
    assert other_profile.id not in ids


@pytest.mark.django_db
def test_appointment_serializer_rejects_doctor_not_linked_to_hospital():
    profile = DoctorProfileFactory()
    patient = PatientUserFactory()
    hospital = HospitalFactory()
    slot = SlotFactory(
        doctor=profile.user,
        clinic=None,
        hospital=hospital,
        start=timezone.now() + timedelta(days=1),
        end=timezone.now() + timedelta(days=1, minutes=30),
    )

    serializer = AppointmentSerializer(data={
        "doctor": profile.user.id,
        "patient": patient.id,
        "slot": slot.id,
        "hospital": hospital.id,
        "visit_type": "IN_PERSON",
    })

    assert not serializer.is_valid()
    assert "hospital" in serializer.errors


@pytest.mark.django_db
def test_appointment_serializer_rejects_clinic_not_owned_by_doctor():
    profile = DoctorProfileFactory()
    other_profile = DoctorProfileFactory()
    patient = PatientUserFactory()
    clinic = ClinicFactory(owner=other_profile)
    slot = SlotFactory(
        doctor=profile.user,
        clinic=clinic,
        hospital=None,
        start=timezone.now() + timedelta(days=1),
        end=timezone.now() + timedelta(days=1, minutes=30),
    )

    serializer = AppointmentSerializer(data={
        "doctor": profile.user.id,
        "patient": patient.id,
        "slot": slot.id,
        "clinic": clinic.id,
        "visit_type": "IN_PERSON",
    })

    assert not serializer.is_valid()
    assert "clinic" in serializer.errors


@pytest.mark.django_db
def test_pending_appointment_creates_persistent_doctor_notification():
    profile = DoctorProfileFactory()
    patient = PatientUserFactory()
    clinic = ClinicFactory(owner=profile)
    slot = SlotFactory(
        doctor=profile.user,
        clinic=clinic,
        hospital=None,
        start=timezone.now() + timedelta(days=1),
        end=timezone.now() + timedelta(days=1, minutes=30),
    )

    Appointment.objects.create(
        patient=patient,
        doctor=profile.user,
        slot=slot,
        clinic=clinic,
        visit_type="IN_PERSON",
        status=Appointment.Status.PENDING,
    )

    assert Notification.objects.filter(
        user=profile.user,
        type=Notification.Type.NEW_APPOINTMENT,
    ).exists()
