"""
CuraBook — Centralized Pagination
====================================
All ViewSets use these paginator classes.
Configured to return data inside the success envelope automatically.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """
    Default paginator — 20 items per page.
    Returns paginated data wrapped in the success envelope.

    Improvement 5.2C: Returns relative next/previous URLs (path + query only)
    so absolute localhost:8000 references never leak into production responses.
    """
    page_size              = 20
    page_size_query_param  = 'page_size'
    max_page_size          = 100
    page_query_param       = 'page'

    @staticmethod
    def _make_relative(url):
        """Convert absolute URL → relative path+query string."""
        if not url:
            return None
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(url)
        # Keep only path + query, drop scheme + netloc
        return urlunparse(('', '', parsed.path, parsed.params, parsed.query, parsed.fragment))

    def get_paginated_response(self, data):
        return Response({
            "success": True,
            "data": data,
            "message": "",
            "pagination": {
                "count":       self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "page":        self.page.number,
                "page_size":   self.get_page_size(self.request),
                "next":        self._make_relative(self.get_next_link()),
                "previous":    self._make_relative(self.get_previous_link()),
            },
        })

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "properties": {
                "success":    {"type": "boolean"},
                "data":       schema,
                "message":    {"type": "string"},
                "pagination": {
                    "type": "object",
                    "properties": {
                        "count":       {"type": "integer"},
                        "total_pages": {"type": "integer"},
                        "page":        {"type": "integer"},
                        "page_size":   {"type": "integer"},
                        "next":        {"type": "string", "nullable": True},
                        "previous":    {"type": "string", "nullable": True},
                    },
                },
            },
        }


class LargePagination(StandardPagination):
    """For endpoints needing more data per page (e.g. slots, notifications)."""
    page_size     = 50
    max_page_size = 200


class SmallPagination(StandardPagination):
    """For expensive endpoints (e.g. doctor search with annotations)."""
    page_size     = 10
    max_page_size = 50
