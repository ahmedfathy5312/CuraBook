"""
CuraBook — Appointment Filters
================================
Supports all filters the frontend needs:
  ?status=PENDING
  ?status_in=CONFIRMED,RESCHEDULE_REQUESTED   ← multi-status (comma-separated)
  ?clinic=1
  ?hospital=2
  ?doctor=3
  ?date_from=2024-01-01
  ?date_to=2024-12-31
  ?visit_type=IN_PERSON
"""

import django_filters
from .models import Appointment


class AppointmentFilter(django_filters.FilterSet):
    # Date range on the slot start time
    date_from = django_filters.DateFilter(
        field_name="slot__start__date",
        lookup_expr="gte",
        label="From date (YYYY-MM-DD)",
    )
    date_to = django_filters.DateFilter(
        field_name="slot__start__date",
        lookup_expr="lte",
        label="To date (YYYY-MM-DD)",
    )
    # Today's appointments shortcut
    today = django_filters.BooleanFilter(
        method="filter_today",
        label="Only today's appointments",
    )

    # STATUS-FIX: multi-status filter — ?status_in=CONFIRMED,RESCHEDULE_REQUESTED
    # Allows the frontend to group related statuses under one tab (e.g. "مؤكد"
    # should show both CONFIRMED and RESCHEDULE_REQUESTED appointments).
    status_in = django_filters.CharFilter(
        method="filter_status_in",
        label="Filter by multiple statuses (comma-separated)",
    )

    class Meta:
        model  = Appointment
        fields = {
            "status":     ["exact"],
            "visit_type": ["exact"],
            "clinic":     ["exact"],
            "hospital":   ["exact"],
            "doctor":     ["exact"],
            "patient":    ["exact"],
        }

    def filter_today(self, queryset, name, value):
        if value:
            from django.utils import timezone
            return queryset.filter(slot__start__date=timezone.now().date())
        return queryset

    def filter_status_in(self, queryset, name, value):
        """
        Accept comma-separated status values, e.g. 'CONFIRMED,RESCHEDULE_REQUESTED'.
        Strips whitespace and ignores empty parts for safety.
        """
        if not value:
            return queryset
        statuses = [s.strip().upper() for s in value.split(',') if s.strip()]
        if statuses:
            return queryset.filter(status__in=statuses)
        return queryset
