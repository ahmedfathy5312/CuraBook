"""
CuraBook — Analytics Selectors with Redis Caching

Cache strategy:
  Admin stats:     cache 5 min  (key: analytics:admin)
  Doctor stats:    cache 2 min  (key: analytics:doctor:{user_id})
  Assistant stats: cache 2 min  (key: analytics:assistant:{user_id})
  Hospital stats:  cache 3 min  (key: analytics:hospital:{user_id})

Cache is invalidated on appointment status change via signals.
"""

import logging
from django.db.models import Count, Q
from django.utils import timezone
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.conf import settings
from datetime import timedelta

# MED-03 FIX: Replace lazy (inside-function) imports with canonical top-level imports.
# Lazy imports inside _build_* functions were fragile — a circular import or re-export
# change in hospital/models.py would silently break Analytics at runtime, not at startup.
# Department is imported directly from its canonical app (apps.departments) not via
# hospital.models re-export, which adds an extra fragile indirection.
from appointments.models import Appointment
from hospital.models import Hospital, HospitalDoctor
from clinics.models import Clinic
from notifications.models import Notification
from scheduling.models import GeneratedSlot
try:
    from apps.departments.models import Department
except ImportError:
    # Fallback: some project layouts keep Department in hospital.models
    from hospital.models import Department

logger = logging.getLogger('curabook')

ADMIN_TTL     = 60 * 5   # 5 min
DOCTOR_TTL    = 60 * 2   # 2 min
ASSISTANT_TTL = 60 * 2   # 2 min
HOSPITAL_TTL  = 60 * 3   # 3 min
ADMIN_CACHE_VERSION = 'v2'
HOSPITAL_CACHE_VERSION = 'v3'


def _get_or_set(key: str, builder_fn, ttl: int):
    """Safe cache wrapper — falls back to DB on cache error."""
    try:
        cached = cache.get(key)
        if cached is not None:
            logger.debug(f'[Analytics] Cache HIT: {key}')
            return cached
    except Exception as e:
        logger.warning(f'[Analytics] Cache get error: {e}')

    data = builder_fn()

    try:
        cache.set(key, data, timeout=ttl)
        logger.debug(f'[Analytics] Cache SET: {key}')
    except Exception as e:
        logger.warning(f'[Analytics] Cache set error: {e}')

    return data


def invalidate_user_analytics(user_id: int):
    """Call this after any appointment change for this user."""
    try:
        cache.delete_many([
            f'analytics:doctor:{user_id}',
            f'analytics:patient:{user_id}',
            f'analytics:assistant:{user_id}',
            'analytics:admin',
            f'analytics:admin:{ADMIN_CACHE_VERSION}',
        ])
        invalidate_admin_analytics()
    except Exception:
        pass


def invalidate_admin_analytics():
    """Invalidate platform-wide admin analytics and the common chart ranges."""
    try:
        cache.delete_many([
            'analytics:admin',
            f'analytics:admin:{ADMIN_CACHE_VERSION}',
            *[
                f'analytics:admin:time_series:{ADMIN_CACHE_VERSION}:{days}'
                for days in (7, 30, 90, 365)
            ],
            *[
                f'analytics:admin:time_series:{days}'
                for days in (7, 30, 90, 365)
            ],
        ])
        delete_pattern = getattr(cache, 'delete_pattern', None)
        if callable(delete_pattern):
            delete_pattern(f'analytics:admin:time_series:{ADMIN_CACHE_VERSION}:*')
            delete_pattern('analytics:admin:time_series:*')
    except Exception:
        pass


def invalidate_hospital_analytics(user_id: int):
    try:
        cache.delete_many([
            f'analytics:hospital:{user_id}',
            f'analytics:hospital:{HOSPITAL_CACHE_VERSION}:{user_id}',
            'analytics:admin',
            f'analytics:admin:{ADMIN_CACHE_VERSION}',
        ])
        invalidate_admin_analytics()
    except Exception:
        pass


# ─────────────────────────────────────────────────────
# ADMIN TIME-SERIES  (Gap #2)
# ─────────────────────────────────────────────────────
def get_admin_time_series(days: int = 30) -> list:
    """
    Returns daily appointment + new-patient counts for the last N days.
    Cached for 10 minutes.  Cache key includes the `days` parameter so
    different day-ranges are cached independently.
    """
    cache_key = f'analytics:admin:time_series:{ADMIN_CACHE_VERSION}:{days}'
    return _get_or_set(cache_key, lambda: _build_time_series(days), ttl=600)


def _build_time_series(days: int) -> list:
    """Build real time-series data from DB — no random numbers."""
    User = get_user_model()
    now  = timezone.now()
    result = []

    for i in range(days, -1, -1):
        day = now - timedelta(days=i)
        day_date = day.date()

        appointments = Appointment.objects.filter(
            created_at__date=day_date
        ).aggregate(
            total    =Count('id'),
            completed=Count('id', filter=Q(status='COMPLETED')),
            cancelled=Count('id', filter=Q(status='CANCELLED')),
        )

        new_patients = User.objects.filter(
            date_joined__date=day_date,
            is_patient=True,
        ).count()

        result.append({
            'date':         day_date.strftime('%Y-%m-%d'),
            'label':        day.strftime('%d/%m'),
            'مواعيد':       appointments['total'],
            'مكتملة':       appointments['completed'],
            'ملغية':        appointments['cancelled'],
            'مرضى_جدد':    new_patients,
        })

    return result


# ─────────────────────────────────────────────────────
# ADMIN DASHBOARD
# ─────────────────────────────────────────────────────
def get_admin_stats() -> dict:
    return _get_or_set(f'analytics:admin:{ADMIN_CACHE_VERSION}', _build_admin_stats, 30)


def _redis_client_from_url(url: str):
    try:
        import redis
        return redis.Redis.from_url(url)
    except Exception as exc:
        logger.warning(f'[Analytics] Redis client unavailable: {exc}')
        return None


def _get_ws_metrics() -> tuple[int, int]:
    try:
        from notifications.presence import PresenceService
        client = cache.client.get_client()
        online_keys = list(client.scan_iter(f'{PresenceService.ONLINE_KEY_PREFIX}*'))
        conn_keys = list(client.scan_iter(f'{PresenceService.CONN_KEY_PREFIX}*'))
        connections = 0
        for key in conn_keys:
            try:
                connections += int(client.get(key) or 0)
            except (TypeError, ValueError):
                continue
        return len(online_keys), connections
    except Exception as exc:
        logger.warning(f'[Analytics] WS metrics unavailable: {exc}')
        return 0, 0


def _get_celery_queue_depth() -> int:
    depth = 0
    try:
        from curabook.celery import app
        inspect = app.control.inspect(timeout=1)
        reserved = inspect.reserved() or {}
        scheduled = inspect.scheduled() or {}
        active = inspect.active() or {}
        depth += sum(len(v) for v in reserved.values())
        depth += sum(len(v) for v in scheduled.values())
        depth += sum(len(v) for v in active.values())
    except Exception as exc:
        logger.warning(f'[Analytics] Celery inspect metrics unavailable: {exc}')

    try:
        client = _redis_client_from_url(getattr(settings, 'CELERY_BROKER_URL', ''))
        if client:
            depth += int(client.llen('celery') or 0)
    except Exception as exc:
        logger.warning(f'[Analytics] Celery broker queue depth unavailable: {exc}')

    return depth


def _get_requests_per_minute(now) -> int:
    try:
        from audit.models import AuditLog
        return AuditLog.objects.filter(timestamp__gte=now - timedelta(seconds=60)).count()
    except Exception as exc:
        logger.warning(f'[Analytics] request rate metric unavailable: {exc}')
        return 0


def _build_admin_stats() -> dict:
    User = get_user_model()
    now  = timezone.now()
    active_users, ws_connections = _get_ws_metrics()
    requests_per_min = _get_requests_per_minute(now)
    queue_depth = _get_celery_queue_depth()

    users = User.objects.filter(is_deleted=False)
    doctor_users = users.filter(
        Q(is_doctor=True) | Q(doctor_profile__isnull=False)
    ).distinct()
    patient_users = users.filter(
        Q(is_patient=True) | Q(patient_profile__isnull=False)
    ).distinct()
    assistant_users = users.filter(
        Q(is_assistant=True) | Q(assistant_profile__isnull=False)
    ).distinct()

    appt_counts = Appointment.objects.aggregate(
        total=Count('id'),
        pending=Count('id',   filter=Q(status='PENDING')),
        confirmed=Count('id', filter=Q(status='CONFIRMED')),
        completed=Count('id', filter=Q(status='COMPLETED')),
        cancelled=Count('id', filter=Q(status='CANCELLED')),
        rejected=Count('id',  filter=Q(status='REJECTED')),
    )

    # ── Trend helpers (current month vs previous month) ──────────────────────
    this_month_start = now - timedelta(days=30)
    last_month_start = now - timedelta(days=60)

    def _calc_trend(model, date_field='date_joined', filter_kwargs=None):
        """Return % change between this month and the previous month (rounded int)."""
        fk = filter_kwargs or {}
        this_month = model.objects.filter(
            **fk, **{f'{date_field}__gte': this_month_start}
        ).count()
        last_month = model.objects.filter(
            **fk,
            **{f'{date_field}__gte': last_month_start, f'{date_field}__lt': this_month_start}
        ).count()
        if last_month == 0:
            return 0
        return round(((this_month - last_month) / last_month) * 100)

    return {
        'total_users':      users.count(),
        'total_doctors':    doctor_users.count(),
        'total_patients':   patient_users.count(),
        'total_assistants': assistant_users.count(),
        'total_hospitals':  Hospital.objects.filter(is_active=True).count(),
        'total_clinics':    Clinic.objects.filter(is_active=True).count(),
        **{f'appointments_{k}': v for k, v in appt_counts.items()},
        'unread_notifications': Notification.objects.filter(is_read=False).count(),
        'new_users_last_30d':   users.filter(date_joined__gte=now - timedelta(days=30)).count(),
        'new_appointments_last_30d': Appointment.objects.filter(
            created_at__gte=now - timedelta(days=30)
        ).count(),
        # ── Trend fields (▲/▼ arrows in the admin OverviewSection) ────────────
        'hospitals_trend':    _calc_trend(Hospital,     'created_at',  {'is_active': True}),
        'doctors_trend':      _calc_trend(User,         'date_joined', {'is_doctor': True}),
        'patients_trend':     _calc_trend(User,         'date_joined', {'is_patient': True}),
        'appointments_trend': _calc_trend(Appointment,  'created_at'),
        'active_users': active_users,
        'ws_connections': ws_connections,
        'queue_depth': queue_depth,
        'requests_per_min': requests_per_min,
        'realtime': {
            'active_users': active_users,
            'ws_connections': ws_connections,
            'queue_depth': queue_depth,
            'requests_per_min': requests_per_min,
            'sampled_at': now.isoformat(),
        },
    }


# ─────────────────────────────────────────────────────
# DOCTOR DASHBOARD
# ─────────────────────────────────────────────────────
def get_doctor_stats(doctor_user) -> dict:
    key = f'analytics:doctor:{doctor_user.id}'
    return _get_or_set(key, lambda: _build_doctor_stats(doctor_user), DOCTOR_TTL)


def _build_doctor_stats(doctor_user) -> dict:
    from appointments.serializers import AppointmentListSerializer

    now   = timezone.now()
    today = timezone.localdate()

    # Guard: doctor_profile may not exist for newly registered doctors
    try:
        profile = doctor_user.doctor_profile
    except Exception:
        profile = None

    clinic = getattr(profile, 'clinic', None) if profile else None
    appts   = Appointment.objects.filter(doctor=doctor_user)

    # ── Counts ──────────────────────────────────────────────────────────────
    appt_counts = appts.aggregate(
        total     = Count('id'),
        pending   = Count('id', filter=Q(status='PENDING')),
        confirmed = Count('id', filter=Q(status='CONFIRMED')),
        completed = Count('id', filter=Q(status='COMPLETED')),
        cancelled = Count('id', filter=Q(status='CANCELLED')),
    )

    total_all       = appt_counts['total']
    total_completed = appt_counts['completed']
    completion_rate = round((total_completed / total_all) * 100) if total_all else 0

    # ── Today's Revenue ─────────────────────────────────────────────────────
    today_fee = (
        clinic.consultation_price
        if clinic and clinic.consultation_price
        else getattr(profile, 'consultation_fee', None) or 0
    )
    today_completed_count = appts.filter(
        status='COMPLETED',
        slot__start__date=today
    ).count()
    today_revenue = float(today_fee * today_completed_count)

    # ── Available Slots ──────────────────────────────────────────────────────
    available_slots = GeneratedSlot.objects.filter(
        doctor=doctor_user,
        is_active=True,
        is_booked=False,
        start__gte=now,
        start__lte=now + timedelta(days=7),
    ).count()

    # ── Upcoming Appointments (serialized) ───────────────────────────────────
    upcoming_qs = (
        appts
        .filter(status='CONFIRMED', slot__start__gte=now)
        .select_related('patient', 'slot', 'clinic', 'hospital')
        .order_by('slot__start')[:10]
    )
    try:
        upcoming_serialized = AppointmentListSerializer(upcoming_qs, many=True).data
    except Exception:
        upcoming_serialized = []

    # ── Hospital affiliation ─────────────────────────────────────────────────
    hospital_link = (
        doctor_user.hospital_doctor_links
        .filter(is_active=True)
        .select_related('hospital')
        .first()
    ) if hasattr(doctor_user, 'hospital_doctor_links') else None

    return {
        # ── Doctor Identity ──────────────────────────────────────────────────
        'name':             getattr(profile, 'full_name', '') or '',
        'specialty':        getattr(profile, 'specialty', '') or '',
        'phone':            getattr(doctor_user, 'phone', '') or '',
        'profile_image':    getattr(profile, 'profile_image', '') or '',
        'experience_years': getattr(profile, 'experience_years', None),
        'accepts_booking':  getattr(profile, 'accepts_booking', True),

        # ── Clinic Info ──────────────────────────────────────────────────────
        'clinic_id':    clinic.id    if clinic else None,
        'clinic_name':  clinic.name  if clinic else None,
        'clinic_city':  clinic.city  if clinic else None,
        'clinic_phone': clinic.phone if clinic else None,
        'location':     clinic.city  if clinic else None,

        # ── Hospital Info ────────────────────────────────────────────────────
        'hospital_name': hospital_link.hospital.name if hospital_link else None,

        # ── Stats (renamed to match frontend expectations) ────────────────────
        'today_count':      appts.filter(slot__start__date=today).count(),
        'pending_count':    appt_counts['pending'],
        'confirmed_count':  appt_counts['confirmed'],
        'completed_count':  total_completed,
        'cancelled_count':  appt_counts['cancelled'],
        'total_count':      total_all,
        'unique_patients':  appts.values('patient').distinct().count(),
        'available_slots_7d': available_slots,
        'today_revenue':    today_revenue,
        'completion_rate':  completion_rate,
        'unread_notifications': Notification.objects.filter(
            user=doctor_user, is_read=False
        ).count(),
        'upcoming_appointments': upcoming_serialized,

        # ── Legacy keys (backward compat for any old frontend reads) ──────────
        'appointments_total':     total_all,
        'appointments_pending':   appt_counts['pending'],
        'appointments_confirmed': appt_counts['confirmed'],
        'appointments_completed': total_completed,
        'appointments_cancelled': appt_counts['cancelled'],
        'today_appointments':     appts.filter(slot__start__date=today).count(),
    }


# ─────────────────────────────────────────────────────
# ASSISTANT DASHBOARD
# ─────────────────────────────────────────────────────
def get_assistant_stats(assistant_user) -> dict:
    key = f'analytics:assistant:{assistant_user.id}'
    return _get_or_set(key, lambda: _build_assistant_stats(assistant_user), ASSISTANT_TTL)


def _build_assistant_stats(assistant_user) -> dict:
    try:
        ap = assistant_user.assistant_profile
    except Exception:
        return {'error': 'No assistant profile found'}

    clinic_ids   = list(ap.clinic_assignments.filter(is_active=True).values_list('clinic_id', flat=True))
    hospital_ids = list(ap.hospital_assignments.filter(is_active=True).values_list('hospital_id', flat=True))

    appts = Appointment.objects.filter(
        Q(clinic_id__in=clinic_ids) | Q(hospital_id__in=hospital_ids)
    )

    now = timezone.now()

    appt_counts = appts.aggregate(
        total=Count('id'),
        pending=Count('id',   filter=Q(status='PENDING')),
        confirmed=Count('id', filter=Q(status='CONFIRMED')),
        completed=Count('id', filter=Q(status='COMPLETED')),
        cancelled=Count('id', filter=Q(status='CANCELLED')),
    )

    pending_appts  = list(appts.filter(status='PENDING').select_related('patient', 'doctor', 'slot', 'clinic', 'hospital').order_by('created_at')[:20])
    upcoming_appts = list(appts.filter(status='CONFIRMED', slot__start__gte=now).select_related('patient', 'doctor', 'slot').order_by('slot__start')[:10])

    return {
        **{f'appointments_{k}': v for k, v in appt_counts.items()},
        'managed_clinics':       len(clinic_ids),
        'managed_hospitals':     len(hospital_ids),
        'pending_appointments':  pending_appts,
        'upcoming_appointments': upcoming_appts,
    }


# ─────────────────────────────────────────────────────
# HOSPITAL DASHBOARD
# ─────────────────────────────────────────────────────
def get_hospital_stats(hospital_user) -> dict:
    key = f'analytics:hospital:{HOSPITAL_CACHE_VERSION}:{hospital_user.id}'
    return _get_or_set(key, lambda: _build_hospital_stats(hospital_user), HOSPITAL_TTL)


def _build_hospital_stats(hospital_user) -> dict:
    hospital_ids = list(
        hospital_user.hospital_admin_links.values_list('hospital_id', flat=True)
    )

    if not hospital_ids:
        return {'error': 'No hospitals assigned'}

    appts = Appointment.objects.filter(hospital_id__in=hospital_ids)
    now   = timezone.now()
    today = timezone.localdate()

    appt_counts = appts.aggregate(
        total=Count('id'),
        pending=Count('id',   filter=Q(status='PENDING')),
        confirmed=Count('id', filter=Q(status='CONFIRMED')),
        completed=Count('id', filter=Q(status='COMPLETED')),
        cancelled=Count('id', filter=Q(status='CANCELLED')),
    )

    pending_appts = list(
        appts.filter(status='PENDING')
        .select_related('patient', 'doctor', 'slot')
        .order_by('created_at')[:20]
    )

    return {
        **{f'appointments_{k}': v for k, v in appt_counts.items()},
        'today_appointments': appts.filter(slot__start__date=today).count(),
        'total_doctors':      HospitalDoctor.objects.filter(hospital_id__in=hospital_ids, is_active=True).count(),
        'total_patients':     appts.exclude(patient_id__isnull=True).values('patient_id').distinct().count(),
        'total_departments':  Department.objects.filter(hospital_id__in=hospital_ids).count(),
        'managed_hospitals':  len(hospital_ids),
        'pending_appointments': pending_appts,
    }
