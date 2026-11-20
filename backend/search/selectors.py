"""
CuraBook — Search Selectors
==============================
Doctor search using PostgreSQL Full-Text Search (backed by GIN index).
Falls back to icontains for non-PG environments (dev/sqlite).

BUG-FIX #6:
  - "متاح اليوم" (available today): filter now checks that a slot exists
    specifically for TODAY (date range), not just any future slot.
  - "الأقرب" (nearest): accepts user_lat/user_lng and annotates a
    distance_km field using the Haversine formula so the View can
    order by real geographic distance.
"""

import logging
from django.db.models import Q, Avg, QuerySet

logger = logging.getLogger("curabook.search")


def get_doctor_search_queryset(
    query: str = "",
    specialty: str = "",
    city: str = "",
    only_available: bool = False,
    availability_range: str = "",   # BUG-FIX #6: 'today'|'this_week'|'this_month'|''
    min_rating: float = None,
    max_fee: float = None,
    min_fee: float = None,
    hospital_id: int = None,   # FIX #11: filter doctors by hospital
    user_lat: float = None,    # BUG-FIX #6: user GPS latitude for 'nearest' sort
    user_lng: float = None,    # BUG-FIX #6: user GPS longitude for 'nearest' sort
) -> QuerySet:
    """
    Returns a DoctorProfile queryset matching given filters.
    Uses PostgreSQL Full-Text Search (GIN-indexed) when query is provided.
    Caller is responsible for slicing / pagination.
    Results are NOT cached here — caching lives in services.py.
    """
    from apps.doctors.models import DoctorProfile
    from django.utils import timezone
    from django.conf import settings

    qs = (
        DoctorProfile.objects
        .select_related("user")
        .only(
            "id", "slug", "specialty", "bio", "accepts_booking",
            "consultation_fee", "slot_duration",
            "user__id", "user__full_name", "user__city",
            "user__email", "user__username",
        )
        .filter(
            user__is_active=True,
            user__is_deleted=False,
            accepts_booking=True,
        )
    )

    # ── Full-Text Search (PostgreSQL GIN index) ──────────────────────────────
    if query:
        db_engine = settings.DATABASES.get("default", {}).get("ENGINE", "")
        is_postgres = "postgresql" in db_engine or "postgis" in db_engine

        # BUG-FIX: Partial name search — always use icontains so that typing
        # a single character or partial name returns correct results.
        qs = qs.filter(
            Q(user__full_name__icontains=query)
            | Q(specialty__icontains=query)
            | Q(bio__icontains=query)
        )
        if is_postgres and len(query) >= 2:
            try:
                from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
                search_vector = (
                    SearchVector("user__full_name", weight="A", config="simple")
                    + SearchVector("specialty",      weight="B", config="simple")
                    + SearchVector("bio",            weight="C", config="simple")
                )
                search_query = SearchQuery(query, config="simple", search_type="plain")
                qs = qs.annotate(
                    rank=SearchRank(search_vector, search_query, normalization=2),
                )
                logger.debug(f"[Search] Using icontains + PG rank annotation for query='{query}'")
            except Exception as e:
                logger.warning(f"[Search] PG rank annotation failed (non-critical): {e}")

    # ── Filters ───────────────────────────────────────────────────────────────
    if specialty:
        qs = qs.filter(specialty__icontains=specialty)

    if city:
        qs = qs.filter(user__city__iexact=city)

    if max_fee is not None:
        qs = qs.filter(
            Q(consultation_fee__lte=max_fee) | Q(consultation_fee__isnull=True)
        )

    if min_fee is not None:
        qs = qs.filter(consultation_fee__gte=min_fee)

    if only_available:
        # BUG-FIX #6: "متاح اليوم" (sort=available / availability=today) must check
        # TODAY's slots only. "this_week" and "this_month" extend the window accordingly.
        # Previously the filter used slot__start__gt=now which matched ANY future slot
        # (tomorrow, next month, etc.) — misleading for the "available today" label.
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        if availability_range in ('today', 'available', ''):
            # Default: today only
            today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            slot_filter = Q(
                user__slots__start__gte=today_start,
                user__slots__start__lte=today_end,
                user__slots__is_booked=False,
                user__slots__is_active=True,
            )
        elif availability_range == 'this_week':
            import datetime
            week_end = today_start + datetime.timedelta(days=7)
            slot_filter = Q(
                user__slots__start__gte=now,
                user__slots__start__lt=week_end,
                user__slots__is_booked=False,
                user__slots__is_active=True,
            )
        elif availability_range == 'this_month':
            import datetime
            month_end = today_start + datetime.timedelta(days=30)
            slot_filter = Q(
                user__slots__start__gte=now,
                user__slots__start__lt=month_end,
                user__slots__is_booked=False,
                user__slots__is_active=True,
            )
        else:
            # Fallback: any future slot
            slot_filter = Q(
                user__slots__start__gt=now,
                user__slots__is_booked=False,
                user__slots__is_active=True,
            )

        qs = qs.filter(slot_filter).distinct()

    # FIX #11: filter by hospital — only doctors linked to this hospital via HospitalDoctor
    if hospital_id:
        qs = qs.filter(
            user__hospital_doctor_links__hospital_id=hospital_id,
            user__hospital_doctor_links__is_active=True,
        ).distinct()
    else:
        qs = qs.filter(
            clinics_owned__is_active=True,
            clinics_owned__is_deleted=False,
        ).distinct()

    # ── Annotate rating + review count ──────────────────────────────────────
    from django.db.models import Count
    qs = qs.annotate(
        avg_rating=Avg("user__reviews_received__rating"),
        review_count=Count("user__reviews_received"),
    )

    if min_rating is not None:
        qs = qs.filter(avg_rating__gte=min_rating)

    # ── BUG-FIX #6: Annotate distance_km using Haversine formula ─────────────
    # Only done when user GPS coords are available (sort=nearest with geolocation ok).
    # Uses a raw SQL expression compatible with both PostgreSQL and SQLite.
    if user_lat is not None and user_lng is not None:
        try:
            from django.db.models import FloatField, ExpressionWrapper
            from django.db.models.functions import ACos, Cos, Sin, Radians
            from django.db.models import Value

            # Haversine approximation — result in km
            # distance = acos( sin(lat1)*sin(lat2) + cos(lat1)*cos(lat2)*cos(lng2-lng1) ) * R
            R = 6371.0  # Earth radius in km
            lat1_rad = user_lat * 3.14159265358979 / 180.0
            lng1_rad = user_lng * 3.14159265358979 / 180.0

            qs = qs.annotate(
                distance_km=ExpressionWrapper(
                    ACos(
                        Sin(Radians(Value(user_lat))) * Sin(Radians("user__latitude"))
                        + Cos(Radians(Value(user_lat))) * Cos(Radians("user__latitude"))
                        * Cos(Radians("user__longitude") - Radians(Value(user_lng)))
                    ) * Value(R),
                    output_field=FloatField(),
                )
            )
            logger.debug(f"[Search] Annotated distance_km from ({user_lat}, {user_lng})")
        except Exception as e:
            # If the User model doesn't have lat/lng fields yet, skip silently
            # and fall back to rating sort — caller handles the fallback.
            logger.warning(f"[Search] distance_km annotation failed (non-critical): {e}")

    # ── Ordering: FTS rank > rating > name > id (stable tiebreaker) ──────────
    if query and "rank" in str(qs.query):
        try:
            return qs.order_by("-rank", "-avg_rating", "user__full_name", "user_id")
        except Exception:
            return qs.order_by("-avg_rating", "user__full_name", "user_id")
    return qs.order_by("-avg_rating", "user__full_name", "user_id")
