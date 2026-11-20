"""
notifications/tests.py — Real unit tests for the notifications app.
WebSocket integration tests: frontend/src/__tests__/websocket.test.js
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


class NotificationModelTest(TestCase):

    def test_notification_model_importable(self):
        from notifications.models import Notification
        self.assertIsNotNone(Notification)

    def test_notification_has_required_fields(self):
        from notifications.models import Notification
        field_names = [f.name for f in Notification._meta.get_fields()]
        for required in ['user', 'title', 'message', 'is_read']:
            self.assertIn(required, field_names,
                          f"Notification missing field: {required}")

    def test_notification_default_is_unread(self):
        from notifications.models import Notification
        n = Notification.__new__(Notification)
        # Default value for is_read should be False
        field = Notification._meta.get_field('is_read')
        self.assertEqual(field.default, False)


class NotificationAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='notif_user', email='notif@test.com',
            password='Test@12345', is_patient=True,
        )

    def test_notification_list_requires_auth(self):
        response = self.client.get('/api/v1/notifications/')
        self.assertIn(response.status_code, [401, 403])

    def test_notification_list_accessible_when_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/notifications/')
        self.assertEqual(response.status_code, 200)

    def test_mark_all_read_requires_auth(self):
        response = self.client.post('/api/v1/notifications/mark_all_read/')
        self.assertIn(response.status_code, [401, 403])

    def test_mark_all_read_uses_underscore_not_hyphen(self):
        """F-04 fix: endpoint must be mark_read (underscore), not mark-read (hyphen)."""
        self.client.force_authenticate(user=self.user)
        # Correct endpoint (underscore) → 200
        good = self.client.post('/api/v1/notifications/mark_all_read/')
        self.assertNotEqual(good.status_code, 404,
                             "mark_all_read/ endpoint not found — URL registration issue")
        # Wrong endpoint (hyphen) → 404 or 405
        bad = self.client.post('/api/v1/notifications/mark-all-read/')
        self.assertIn(bad.status_code, [404, 405],
                      "mark-all-read/ should NOT exist — remove hyphenated duplicate")

    def test_unread_count_endpoint_exists(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/notifications/unread_count/')
        self.assertNotEqual(response.status_code, 404)

    def tearDown(self):
        User.objects.filter(username='notif_user').delete()


class NotificationConsumerImportTest(TestCase):
    """Verify WebSocket consumer is importable and has required handlers."""

    def test_consumer_importable(self):
        from notifications.consumers import NotificationConsumer
        self.assertIsNotNone(NotificationConsumer)

    def test_consumer_has_connect_handler(self):
        from notifications.consumers import NotificationConsumer
        self.assertTrue(hasattr(NotificationConsumer, 'connect'))

    def test_consumer_has_disconnect_handler(self):
        from notifications.consumers import NotificationConsumer
        self.assertTrue(hasattr(NotificationConsumer, 'disconnect'))

    def test_consumer_has_receive_handler(self):
        from notifications.consumers import NotificationConsumer
        self.assertTrue(hasattr(NotificationConsumer, 'receive'))
