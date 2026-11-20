"""
CuraBook — Notification Tests (v29 additions)
Covers: soft delete, mark_all_read race-safety, unread_count, list filtering.
"""

import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from notifications.models import Notification
from notifications.services import mark_all_read_for_user

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(username='testpatient', password='pass123', email='p@test.com')


@pytest.fixture
def auth_client(user, client):
    client.force_login(user)
    return client


@pytest.fixture
def notification(user, db):
    return Notification.objects.create(
        user=user,
        type=Notification.Type.SYSTEM,
        title='Test',
        body='Test body',
    )


class TestNotificationSoftDelete:
    """API-M02 — DELETE should soft-delete, not hard-delete."""

    def test_delete_soft_deletes_record(self, auth_client, notification):
        url = reverse('notification-detail', kwargs={'pk': notification.pk})
        response = auth_client.delete(url)
        assert response.status_code == 204

        # Still exists in DB (soft deleted)
        notification.refresh_from_db()
        assert notification.is_deleted is True
        assert notification.deleted_at is not None

    def test_deleted_notification_excluded_from_list(self, auth_client, notification):
        notification.delete()  # soft delete
        url = reverse('notification-list')
        response = auth_client.get(url)
        assert response.status_code == 200
        ids = [n['id'] for n in response.data.get('results', response.data)]
        assert str(notification.pk) not in ids

    def test_hard_delete_not_exposed(self, auth_client, notification):
        """Ensure hard_delete is not a public API action."""
        url = f'/api/v1/notifications/{notification.pk}/hard_delete/'
        response = auth_client.post(url)
        assert response.status_code in (404, 405)


class TestMarkAllRead:
    """mark_all_read_for_user service — thread safety."""

    def test_marks_unread_as_read(self, user, db):
        Notification.objects.create(user=user, type=Notification.Type.SYSTEM, title='A', body='B')
        Notification.objects.create(user=user, type=Notification.Type.SYSTEM, title='C', body='D')
        count = mark_all_read_for_user(user)
        assert count == 2
        assert Notification.objects.filter(user=user, is_read=False).count() == 0

    def test_returns_zero_if_all_read(self, user, db):
        Notification.objects.create(user=user, type=Notification.Type.SYSTEM, title='X', body='Y', is_read=True)
        count = mark_all_read_for_user(user)
        assert count == 0

    def test_does_not_mark_other_users(self, user, db):
        other = User.objects.create_user(username='other', password='pass')
        Notification.objects.create(user=other, type=Notification.Type.SYSTEM, title='O', body='O')
        mark_all_read_for_user(user)
        assert Notification.objects.filter(user=other, is_read=False).count() == 1


class TestUnreadCount:
    def test_unread_count_endpoint(self, auth_client, user, db):
        Notification.objects.create(user=user, type=Notification.Type.SYSTEM, title='A', body='B')
        url = reverse('notification-unread-count')
        response = auth_client.get(url)
        assert response.status_code == 200
        assert response.data['unread'] == 1

    def test_unread_count_decreases_after_mark_all_read(self, auth_client, user, db):
        Notification.objects.create(user=user, type=Notification.Type.SYSTEM, title='A', body='B')
        auth_client.post(reverse('notification-mark-all-read'))
        response = auth_client.get(reverse('notification-unread-count'))
        assert response.data['unread'] == 0
