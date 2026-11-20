import pytest
from django.contrib.auth import get_user_model

from notifications.models import Notification
from notifications.services import send_notification


@pytest.mark.django_db
def test_duplicate_cancellation_event_creates_one_notification_and_one_push(monkeypatch):
    user = get_user_model().objects.create_user(
        username='cancel-dedupe-patient',
        email='cancel-dedupe@example.com',
        password='TestPass123!',
    )
    pushes = []
    monkeypatch.setattr(
        'notifications.services._push_to_websocket',
        lambda **kwargs: pushes.append(kwargs),
    )

    payload = {
        'user': user,
        'title': 'تم إلغاء الموعد',
        'body': 'تم إلغاء الموعد',
        'notif_type': Notification.Type.APPOINTMENT_CANCELLED,
        'metadata': {'appointment_id': 987654, 'new_status': 'CANCELLED'},
    }

    first = send_notification(**payload)
    second = send_notification(**payload)

    assert second.pk == first.pk
    assert Notification.objects.filter(
        user=user,
        type=Notification.Type.APPOINTMENT_CANCELLED,
        metadata__appointment_id=987654,
    ).count() == 1
    assert len(pushes) == 1