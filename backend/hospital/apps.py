from django.apps import AppConfig


class HospitalsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "hospital"
    # label intentionally NOT set — defaults to "hospital" which matches all migrations
    # (appointments, scheduling, clinics, reviews all reference 'hospital.Hospital')
    verbose_name = "Hospitals"

    def ready(self):
        import hospital.signals  # noqa
