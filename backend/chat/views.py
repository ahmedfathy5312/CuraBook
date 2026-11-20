"""
REST API for doctor-patient conversations and messages.

Conversations are only available for doctor/patient pairs that have at least
one confirmed appointment. This keeps patient chat tied to a real booking.
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

User = get_user_model()


class ConversationViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        user = self.request.user
        qs = (
            Conversation.objects
            .filter(Q(participant_one=user) | Q(participant_two=user))
            .select_related('participant_one', 'participant_two')
            .prefetch_related('messages')
            .order_by('-last_message_at', '-updated_at')
        )

        if self._is_doctor(user) or self._is_patient(user):
            allowed_ids = self._confirmed_chat_partner_ids(user)
            qs = qs.filter(
                Q(participant_one=user, participant_two_id__in=allowed_ids) |
                Q(participant_two=user, participant_one_id__in=allowed_ids)
            )
        return qs

    def list(self, request):
        self._ensure_related_conversations(request.user)
        ser = ConversationSerializer(
            self.get_queryset(),
            many=True,
            context={'request': request},
        )
        return Response(ser.data)

    def create(self, request):
        participant_id = request.data.get('participant_id')
        if not participant_id:
            return Response({'detail': 'participant_id required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other = User.objects.get(pk=participant_id, is_active=True)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if other == request.user:
            return Response({'detail': 'Cannot start conversation with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        if not self._can_chat(request.user, other):
            raise PermissionDenied('Chat is available only after a confirmed appointment.')

        conv, _ = Conversation.get_or_create_for_pair(request.user, other)
        ser = ConversationSerializer(conv, context={'request': request})
        return Response(ser.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def messages(self, request, pk=None):
        if request.method == 'POST':
            return self._create_message_response(request, pk)

        conv = self._get_conv(pk)
        msgs = conv.messages.select_related('sender').order_by('-created_at')
        page_size = int(request.query_params.get('page_size', 30))
        page = int(request.query_params.get('page', 1))
        start, end = (page - 1) * page_size, page * page_size
        ser = MessageSerializer(list(msgs[start:end]), many=True, context={'request': request})
        return Response({'results': ser.data, 'count': msgs.count(), 'page': page})

    @action(detail=True, methods=['post'], url_path='messages/send', parser_classes=[MultiPartParser, FormParser, JSONParser])
    def send_message(self, request, pk=None):
        return self._create_message_response(request, pk)

    @action(detail=True, methods=['patch'], url_path=r'messages/(?P<message_id>[^/.]+)')
    def edit_message(self, request, pk=None, message_id=None):
        conv = self._get_conv(pk)
        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'detail': 'content required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            msg = conv.messages.get(pk=message_id, sender=request.user, message_type='text')
        except Message.DoesNotExist:
            raise NotFound('Message not found.')

        msg.content = content
        msg.edited_at = timezone.now()
        msg.save(update_fields=['content', 'edited_at'])

        latest_msg = conv.messages.order_by('-created_at').first()
        if latest_msg and latest_msg.pk == msg.pk:
            conv.last_message_preview = self._preview_for_message(msg)
            conv.last_message_at = msg.created_at
            conv.save(update_fields=['last_message_preview', 'last_message_at', 'updated_at'])

        data = MessageSerializer(msg, context={'request': request}).data
        self._broadcast_to_chat(conv, {'type': 'message_updated', 'message': dict(data)})
        return Response(data)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        conv = self._get_conv(pk)
        updated = conv.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        if updated:
            self._broadcast_to_chat(conv, {
                'type': 'read_receipt',
                'reader_id': request.user.pk,
                'conversation_id': conv.pk,
            })
        return Response({'marked_read': updated})

    def _create_message_response(self, request, pk=None):
        conv = self._get_conv(pk)
        content = (request.data.get('content') or '').strip()
        mtype = request.data.get('message_type', 'text')
        file = request.FILES.get('file')

        if not content and not file:
            return Response({'detail': 'content or file required.'}, status=status.HTTP_400_BAD_REQUEST)

        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            content=content,
            message_type=mtype if mtype in ('text', 'image', 'file') else 'text',
            file=file,
            file_name=file.name if file else '',
        )

        conv.last_message_preview = self._preview_for_message(msg)
        conv.last_message_at = timezone.now()
        conv.save(update_fields=['last_message_preview', 'last_message_at', 'updated_at'])

        data = MessageSerializer(msg, context={'request': request}).data
        payload = {'type': 'chat_message', 'message': dict(data), 'conversation_id': conv.pk}
        self._broadcast_to_chat(conv, payload)
        self._broadcast_to_users(conv, payload)
        return Response(data, status=status.HTTP_201_CREATED)

    def _get_conv(self, pk):
        user = self.request.user
        try:
            conv = Conversation.objects.get(
                Q(pk=pk) & (Q(participant_one=user) | Q(participant_two=user))
            )
        except Conversation.DoesNotExist:
            raise NotFound('Conversation not found.')

        other = conv.participant_two if conv.participant_one_id == user.pk else conv.participant_one
        if not self._can_chat(user, other):
            raise PermissionDenied('Chat is available only after a confirmed appointment.')
        return conv

    def _ensure_related_conversations(self, user):
        related_ids = self._confirmed_chat_partner_ids(user)
        if not related_ids:
            return

        users = User.objects.filter(pk__in=related_ids, is_active=True)
        for other in users:
            Conversation.get_or_create_for_pair(user, other)

    def _confirmed_chat_partner_ids(self, user):
        try:
            from appointments.models import Appointment
        except Exception:
            return []

        if self._is_doctor(user):
            return list(
                Appointment.objects
                .filter(doctor=user, status=Appointment.Status.CONFIRMED)
                .exclude(patient_id=user.pk)
                .values_list('patient_id', flat=True)
                .distinct()
            )

        if self._is_patient(user):
            return list(
                Appointment.objects
                .filter(patient=user, status=Appointment.Status.CONFIRMED)
                .exclude(doctor_id=user.pk)
                .values_list('doctor_id', flat=True)
                .distinct()
            )

        return []

    def _can_chat(self, user, other):
        if not user or not other:
            return False
        if not ((self._is_doctor(user) and self._is_patient(other)) or (self._is_patient(user) and self._is_doctor(other))):
            return False
        return other.pk in self._confirmed_chat_partner_ids(user)

    @staticmethod
    def _is_doctor(user):
        return bool(getattr(user, 'is_doctor', False) or getattr(user, 'role', '') == 'doctor')

    @staticmethod
    def _is_patient(user):
        return bool(getattr(user, 'is_patient', False) or getattr(user, 'role', '') == 'patient')

    @staticmethod
    def _preview_for_message(msg):
        if msg.content:
            return msg.content[:197] + '...' if len(msg.content) > 200 else msg.content
        return f'File: {msg.file_name}'

    @staticmethod
    def _broadcast_to_chat(conv, payload):
        try:
            layer = get_channel_layer()
            async_to_sync(layer.group_send)(f'chat.{conv.pk}', payload)
        except Exception:
            pass

    @staticmethod
    def _broadcast_to_users(conv, payload):
        try:
            layer = get_channel_layer()
            for user_id in [conv.participant_one_id, conv.participant_two_id]:
                async_to_sync(layer.group_send)(f'user_{user_id}', payload)
        except Exception:
            pass
