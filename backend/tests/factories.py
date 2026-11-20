"""
CuraBook — Test Factories (Factory Boy)

Usage:
    user    = UserFactory()
    doctor  = DoctorFactory()
    patient = PatientFactory()
    appt    = AppointmentFactory(patient=patient, doctor=doctor.user)
"""

import factory
from factory.django import DjangoModelFactory
from django.utils import timezone
from datetime import timedelta


# ─────────────────────────────────────────────────────
# User Factories
# ─────────────────────────────────────────────────────
class UserFactory(DjangoModelFactory):
    class Meta:
        model = 'accounts.User'
        skip_postgeneration_save = True

    username  = factory.Sequence(lambda n: f'user_{n}')
    email     = factory.LazyAttribute(lambda o: f'{o.username}@curabook.com')
    full_name = factory.Faker('name')
    phone     = factory.Sequence(lambda n: f'+2010000{n:04d}')
    is_active = True
    password  = factory.PostGenerationMethodCall('set_password', 'Test1234!')

    @factory.post_generation
    def _save_after_password(self, create, extracted, **kwargs):
        # skip_postgeneration_save=True prevents the automatic save after
        # PostGenerationMethodCall, so the password hash never reaches the DB.
        # This explicit hook persists it when using the 'create' strategy.
        if create:
            self.save(update_fields=['password'])


class DoctorUserFactory(UserFactory):
    is_doctor = True
    role      = 'doctor'


class PatientUserFactory(UserFactory):
    is_patient = True
    role       = 'patient'


class AssistantUserFactory(UserFactory):
    is_assistant = True
    role         = 'assistant'


class HospitalAdminUserFactory(UserFactory):
    hospital_admin = True
    role           = 'hospital_admin'


# ─────────────────────────────────────────────────────
# Profile Factories
# ─────────────────────────────────────────────────────
class DoctorProfileFactory(DjangoModelFactory):
    class Meta:
        model = 'doctors.DoctorProfile'

    user      = factory.SubFactory(DoctorUserFactory)
    specialty = factory.Faker('job')
    bio       = factory.Faker('text', max_nb_chars=200)
    slot_duration     = 30
    accepts_booking   = True
    profile_completed = True


class PatientProfileFactory(DjangoModelFactory):
    class Meta:
        model = 'patients.PatientProfile'

    user   = factory.SubFactory(PatientUserFactory)
    gender = 'male'


class AssistantProfileFactory(DjangoModelFactory):
    class Meta:
        model = 'assistants.AssistantProfile'

    user                   = factory.SubFactory(AssistantUserFactory)
    can_manage_appointments = True


# ─────────────────────────────────────────────────────
# Hospital & Clinic Factories
# ─────────────────────────────────────────────────────
class HospitalFactory(DjangoModelFactory):
    class Meta:
        model = 'hospital.Hospital'

    name      = factory.Sequence(lambda n: f'Hospital {n}')
    address   = factory.Faker('address')
    phone     = factory.Sequence(lambda n: f'+201111{n:04d}')
    is_active = True


class ClinicFactory(DjangoModelFactory):
    class Meta:
        model = 'clinics.Clinic'

    owner     = factory.SubFactory(DoctorProfileFactory)
    name      = factory.Sequence(lambda n: f'Clinic {n}')
    is_active = True


class HospitalAdminFactory(DjangoModelFactory):
    class Meta:
        model = 'hospital.HospitalAdmin'

    user     = factory.SubFactory(HospitalAdminUserFactory)
    hospital = factory.SubFactory(HospitalFactory)


class ClinicAssistantFactory(DjangoModelFactory):
    class Meta:
        model = 'clinics.ClinicAssistant'

    assistant = factory.SubFactory(AssistantProfileFactory)
    clinic    = factory.SubFactory(ClinicFactory)
    role      = 'receptionist'
    is_active = True


class HospitalAssistantFactory(DjangoModelFactory):
    class Meta:
        model = 'hospital.HospitalAssistant'

    assistant = factory.SubFactory(AssistantProfileFactory)
    hospital  = factory.SubFactory(HospitalFactory)
    role      = 'receptionist'
    is_active = True


# ─────────────────────────────────────────────────────
# Scheduling Factories
# ─────────────────────────────────────────────────────
class ScheduleFactory(DjangoModelFactory):
    class Meta:
        model = 'scheduling.Schedule'

    doctor       = factory.SubFactory(DoctorUserFactory)
    clinic       = factory.SubFactory(ClinicFactory)
    hospital     = None
    day_of_week  = 2         # Monday
    start_time   = factory.LazyFunction(lambda: timezone.now().replace(hour=9, minute=0, second=0, microsecond=0).time())
    end_time     = factory.LazyFunction(lambda: timezone.now().replace(hour=17, minute=0, second=0, microsecond=0).time())
    slot_duration = 30
    is_active    = True


class SlotFactory(DjangoModelFactory):
    class Meta:
        model = 'scheduling.GeneratedSlot'

    doctor    = factory.SubFactory(DoctorUserFactory)
    clinic    = factory.SubFactory(ClinicFactory)
    hospital  = None
    start     = factory.LazyFunction(lambda: timezone.now() + timedelta(days=1, hours=1))
    end       = factory.LazyFunction(lambda: timezone.now() + timedelta(days=1, hours=1, minutes=30))
    is_booked = False
    is_active = True


# ─────────────────────────────────────────────────────
# Appointment Factory
# ─────────────────────────────────────────────────────
class AppointmentFactory(DjangoModelFactory):
    class Meta:
        model = 'appointments.Appointment'

    patient    = factory.SubFactory(PatientUserFactory)
    doctor     = factory.SubFactory(DoctorUserFactory)
    slot       = factory.SubFactory(SlotFactory)
    clinic     = factory.LazyAttribute(lambda o: o.slot.clinic)
    hospital   = None
    status     = 'PENDING'
    visit_type = 'IN_PERSON'
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(minutes=30))
