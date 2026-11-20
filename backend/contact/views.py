"""
CuraBook — Contact Us View  (FIX B-11 · v31 API-M11)
========================================
POST /api/v1/contact/
  - Open to anyone (AllowAny) — no login required
  - Saves submission to DB for admin review
  - Sends confirmation email to the sender (optional — graceful fail)
  - Rate-limited to 5 submissions / hour per IP to prevent spam

v31 API-M11: business logic moved to contact/services.py — view is now thin.
"""

import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from drf_spectacular.utils import extend_schema

from .serializers import ContactMessageSerializer
from .services import process_contact_submission

logger = logging.getLogger('curabook')


class ContactRateThrottle(AnonRateThrottle):
    """
    Contact form rate throttle.
    F-10 FIX: rate reads from settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['contact']
    Add  'contact': '5/hour'  to DEFAULT_THROTTLE_RATES in settings/base.py.
    """
    scope = 'contact'


@extend_schema(
    tags=['Public'],
    summary='Submit a Contact Us message',
    description=(
        'Open endpoint — no authentication required.\n'
        'Saves the message to the database and sends a confirmation email '
        'to the sender. Rate-limited to 5 submissions per hour per IP.'
    ),
    request=ContactMessageSerializer,
    responses={
        201: {'description': 'Message received — we will get back to you within 24 hours.'},
        400: {'description': 'Validation error — check field errors.'},
        429: {'description': 'Too many requests — try again later.'},
    },
)
class ContactView(APIView):
    """POST /api/v1/contact/"""

    permission_classes = [AllowAny]
    throttle_classes   = [ContactRateThrottle]

    def post(self, request):
        serializer = ContactMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # v31 API-M11: delegate all logic to service — view stays thin
        process_contact_submission(
            name=serializer.validated_data['name'],
            email=serializer.validated_data['email'],
            subject=serializer.validated_data.get('subject', ''),
            message=serializer.validated_data['message'],
            request=request,
        )

        return Response(
            {
                'success': True,
                'message': 'Your message has been received. We will get back to you within 24 hours.',
            },
            status=status.HTTP_201_CREATED,
        )
