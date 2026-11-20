"""
CuraBook — Video Consultation Views
POST   /api/v1/video/sessions/              → ينشئ جلسة فيديو
GET    /api/v1/video/sessions/              → قائمة جلسات المستخدم
GET    /api/v1/video/sessions/{id}/         → تفاصيل الجلسة
GET    /api/v1/video/sessions/{id}/token/   → fresh short-lived token (15 min TTL)
POST   /api/v1/video/sessions/{id}/start/   → يبدأ الجلسة
POST   /api/v1/video/sessions/{id}/end/     → ينهي الجلسة
"""
import logging
from rest_framework import status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.permissions import IsAuthenticated

from appointments.models import Appointment
from .models import VideoSession
from .serializers import VideoSessionSerializer, VideoSessionTokenSerializer
from .services import create_video_session, get_fresh_token, start_session, end_session

logger = logging.getLogger('curabook.video')


class VideoSessionViewSet(mixins.ListModelMixin, GenericViewSet):
    serializer_class = VideoSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_doctor:
            return VideoSession.objects.filter(
                appointment__doctor=user
            ).select_related('appointment').order_by('-id')
        return VideoSession.objects.filter(
            appointment__patient=user
        ).select_related('appointment').order_by('-id')

    def create(self, request):
        """POST /api/v1/video/sessions/ — ينشئ غرفة فيديو لموعد."""
        appt_id = request.data.get('appointment_id')
        if not appt_id:
            return Response({'error': 'appointment_id required'}, status=400)

        try:
            appt = Appointment.objects.get(
                id=appt_id,
                visit_type=Appointment.VisitType.ONLINE,
                status=Appointment.Status.CONFIRMED,
            )
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found or not eligible for video.'}, status=404)

        if request.user != appt.doctor and request.user != appt.patient:
            return Response({'error': 'Permission denied.'}, status=403)

        session = create_video_session(appt)
        return Response(VideoSessionSerializer(session).data, status=201)

    def retrieve(self, request, pk=None):
        try:
            session = self.get_queryset().get(pk=pk)
        except VideoSession.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)
        return Response(VideoSessionSerializer(session).data)

    @action(detail=True, methods=['get'])
    def token(self, request, pk=None):
        """
        GET /api/v1/video/sessions/{id}/token/

        Returns a freshly generated short-lived token (15 min TTL).
        Call this endpoint each time the frontend needs to join or rejoin.
        Tokens are NEVER stored in the database — each call produces a new one.
        """
        try:
            session = self.get_queryset().get(pk=pk)
        except VideoSession.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        if session.status == VideoSession.Status.ENDED:
            return Response({'error': 'Session has ended.'}, status=410)

        is_doctor = request.user == session.appointment.doctor
        data = get_fresh_token(session, is_doctor=is_doctor)
        return Response(VideoSessionTokenSerializer(data).data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        try:
            session = self.get_queryset().get(pk=pk)
        except VideoSession.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)
        session = start_session(session)
        return Response(VideoSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        try:
            session = self.get_queryset().get(pk=pk)
        except VideoSession.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)
        session = end_session(session)
        return Response(VideoSessionSerializer(session).data)
