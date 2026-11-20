from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from django.db.models import Count
from django.utils import timezone
from datetime import timedelta

from .models import SearchLog


class SearchAnalyticsAPIView(APIView):
    """
    Admin-only analytics for search behavior
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        """
        Optional query params:
        - days=7 | 30 | 90   (default=30)
        """
        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timedelta(days=days)

        qs = SearchLog.objects.filter(created_at__gte=since)

        data = {
            # -----------------------------
            # Summary
            # -----------------------------
            "summary": {
                "total_searches": qs.count(),
                "unique_queries": qs.values('query').distinct().count(),
                "unique_users": qs.values('user').distinct().count(),
                "period_days": days,
            },

            # -----------------------------
            # Top Queries
            # -----------------------------
            "top_queries": list(
                qs.values('query')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            ),

            # -----------------------------
            # Search Types Distribution
            # -----------------------------
            "by_type": list(
                qs.values('search_type')
                .annotate(count=Count('id'))
                .order_by('-count')
            ),

            # -----------------------------
            # Daily Activity (for charts)
            # -----------------------------
            "daily_activity": list(
                qs.extra(select={'day': "DATE(created_at)"})
                .values('day')
                .annotate(count=Count('id'))
                .order_by('day')
            ),
        }

        return Response(data, status=status.HTTP_200_OK)
