"""
CuraBook — Search Service with Redis Caching (FIXED)
======================================================
BUG FIX: Previously caching raw Django ORM objects — now caches serialized dicts.
          Raw objects can't be pickled reliably and may return stale data.

Cache key pattern: doctor_search:{version}:{sha256(filters)[:16]}
TTL: 10 minutes for doctors, 5 min for others
"""

import hashlib
import json
import logging

from django.core.cache import cache
from django.db.models import Q

from .models import SearchLog

logger = logging.getLogger('curabook')

CACHE_TTL_DOCTORS   = 60 * 10   # 10 minutes
CACHE_TTL_CLINICS   = 60 * 5
CACHE_TTL_HOSPITALS = 60 * 5


# ─────────────────────────────────────────────────────
# Cache helpers
# ─────────────────────────────────────────────────────

def _get_search_version() -> int:
    return cache.get('doctor_search:version', 0)


def _build_cache_key(prefix: str, **kwargs) -> str:
    """
    Version-aware, deterministic cache key.
    Busted when invalidate_doctor_search_cache() bumps the version.
    Pattern: doctor_search:{prefix}:v{version}:{sha256[:16]}
    """
    version = _get_search_version()
    raw = json.dumps(kwargs, sort_keys=True, default=str)
    digest = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return f'doctor_search:{prefix}:v{version}:{digest}'


def _serialize_doctor_profile(profile) -> dict:
    """
    Serialize DoctorProfile → plain dict safe for Redis.
    NEVER cache ORM objects.
    """
    user = profile.user
    clinic = profile.clinics_owned.filter(is_active=True).first()
    hospital_link = user.hospital_doctor_links.filter(
        hospital__is_active=True,
        is_active=True,
    ).select_related('hospital').first()
    return {
        'id':               profile.id,
        'slug':             profile.slug,
        'specialty':        profile.specialty,
        'bio':              profile.bio,
        'accepts_booking':  profile.accepts_booking,
        'avg_rating':       float(profile.avg_rating) if profile.avg_rating else None,
        'consultation_fee': str(profile.consultation_fee) if profile.consultation_fee else None,
        'experience_years': profile.experience_years,
        'languages':        profile.languages or [],
        'education':        profile.education or [],
        'certificates':     profile.certificates or [],
        'profile_image':    profile.profile_image,
        'clinic_id':        clinic.id if clinic else None,
        'clinic_name':      clinic.name if clinic else None,
        'hospital_id':      hospital_link.hospital.id if hospital_link else None,
        'hospital_name':    hospital_link.hospital.name if hospital_link else None,
        'user': {
            'id':        user.id,
            'full_name': user.full_name,
            'full_name_en': getattr(user, 'full_name_en', None),
            'username':  user.username,
            'city':      user.city,
        },
    }


def _serialize_clinic(clinic) -> dict:
    return {
        'id': clinic.id, 'name': clinic.name, 'slug': clinic.slug,
        'address': clinic.address, 'phone': clinic.phone,
        'owner': clinic.owner.user.full_name if clinic.owner else None,
    }


def _serialize_hospital(hospital) -> dict:
    return {
        'id': hospital.id, 'name': hospital.name, 'slug': hospital.slug,
        'address': hospital.address, 'phone': hospital.phone,
    }


# ─────────────────────────────────────────────────────
# Search Logger
# ─────────────────────────────────────────────────────

def log_search(*, query: str, request=None, search_type=None):
    if search_type is None:
        search_type = SearchLog.SearchType.GENERAL
    try:
        SearchLog.objects.create(
            user=request.user if request and request.user.is_authenticated else None,
            query=query[:255],
            search_type=search_type,
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255] if request else '',
        )
    except Exception as e:
        logger.warning(f'[Search] log_search failed: {e}')


# ─────────────────────────────────────────────────────
# Doctor Search — cached, returns dicts
# ─────────────────────────────────────────────────────

def search_doctors(
    query: str = '',
    specialty: str = '',
    city: str = '',
    only_available: bool = False,
    min_rating: float = None,
    max_fee: float = None,
    min_fee: float = None,
    sort: str = None,   # FIX BUG-06: rating_desc | experience_desc | fee_asc | fee_desc
    hospital_id: int = None,  # FIX #11: filter by hospital
    limit: int = 20,
) -> list:
    cache_key = _build_cache_key(
        'doctors', q=query, specialty=specialty, city=city,
        available=only_available, rating=min_rating,
        max_fee=max_fee, min_fee=min_fee, sort=sort,
        hospital_id=hospital_id, limit=limit,
    )

    cached = cache.get(cache_key)
    if cached is not None:
        logger.debug(f'[Search] Cache HIT: {cache_key}')
        return cached

    from search.selectors import get_doctor_search_queryset
    qs = get_doctor_search_queryset(
        query=query, specialty=specialty, city=city,
        only_available=only_available, min_rating=min_rating,
        max_fee=max_fee, min_fee=min_fee,
        hospital_id=hospital_id,
    )

    # FIX BUG-06: apply sort ordering
    SORT_MAP = {
        'rating_desc':     '-avg_rating',
        'experience_desc': '-years_of_experience',
        'fee_asc':         'consultation_fee',
        'fee_desc':        '-consultation_fee',
    }
    if sort and sort in SORT_MAP:
        qs = qs.order_by(SORT_MAP[sort])

    qs = qs[:limit]

    # ✅ FIXED: serialize to plain dicts before caching
    results = [_serialize_doctor_profile(p) for p in qs]

    cache.set(cache_key, results, timeout=CACHE_TTL_DOCTORS)
    logger.debug(f'[Search] Cache SET: {cache_key} ({len(results)} results)')
    return results


# ─────────────────────────────────────────────────────
# Cache Invalidation
# ─────────────────────────────────────────────────────

def invalidate_doctor_search_cache(doctor_user=None):
    """
    Bump version key — invalidates ALL cached doctor search results instantly.
    Call from post_save signal on DoctorProfile and User.
    """
    try:
        version_key = 'doctor_search:version'
        current = cache.get(version_key, 0)
        cache.set(version_key, current + 1, timeout=None)
        logger.info(
            '[Search] Cache invalidated'
            + (f' (doctor_id={doctor_user.id})' if doctor_user else '')
        )
    except Exception as e:
        logger.warning(f'[Search] Cache invalidation failed: {e}')


# ─────────────────────────────────────────────────────
# Clinic + Hospital Search
# ─────────────────────────────────────────────────────

def search_clinics(query: str, city: str = '', limit: int = 20) -> list:
    from clinics.models import Clinic
    qs = Clinic.objects.select_related('owner__user').filter(is_active=True)
    if query:
        qs = qs.filter(Q(name__icontains=query) | Q(address__icontains=query))
    if city:
        qs = qs.filter(address__icontains=city)
    return [_serialize_clinic(c) for c in qs[:limit]]


def search_hospitals(query: str, city: str = '', limit: int = 20) -> list:
    from hospital.models import Hospital
    qs = Hospital.objects.filter(is_active=True)
    if query:
        qs = qs.filter(Q(name__icontains=query) | Q(address__icontains=query))
    if city:
        qs = qs.filter(address__icontains=city)
    return [_serialize_hospital(h) for h in qs[:limit]]


def get_available_slots(doctor_user, from_date=None, to_date=None,
                        location_type=None, location_id=None):
    from scheduling.selectors import get_available_slots_for_doctor
    clinic_id   = location_id if location_type == 'clinic'   else None
    hospital_id = location_id if location_type == 'hospital' else None
    return get_available_slots_for_doctor(
        doctor=doctor_user, from_date=from_date, to_date=to_date,
        clinic_id=clinic_id, hospital_id=hospital_id,
    )


def get_available_slots_for_request(
    doctor_user,
    *,
    from_date=None,
    to_date=None,
    location_type=None,
    location_id=None,
    clinic_id=None,
    hospital_id=None,
):
    """
    Accept both public slot API styles:
    - location_type=clinic&location_id=1
    - clinic_id=1 / hospital_id=1
    """
    if location_type == 'clinic' and location_id:
        clinic_id = location_id
        hospital_id = None
    elif location_type == 'hospital' and location_id:
        hospital_id = location_id
        clinic_id = None

    from scheduling.selectors import get_available_slots_for_doctor
    return get_available_slots_for_doctor(
        doctor=doctor_user,
        from_date=from_date,
        to_date=to_date,
        clinic_id=clinic_id,
        hospital_id=hospital_id,
    )


def search_all(query: str, filters: dict = None, limit: int = 40) -> list:
    filters   = filters or {}
    doctors   = search_doctors(query, **{k: filters[k] for k in ('specialty', 'city', 'only_available') if k in filters})
    clinics   = search_clinics(query, city=filters.get('city', ''))
    hospitals = search_hospitals(query, city=filters.get('city', ''))
    results   = (
        [{'type': 'doctor',   'data': d} for d in doctors] +
        [{'type': 'clinic',   'data': c} for c in clinics] +
        [{'type': 'hospital', 'data': h} for h in hospitals]
    )
    return results[:limit]
