"""
chat/models.py — Real-time in-app messaging between doctor ↔ patient
"""
from django.db import models
from django.conf import settings
from django.utils import timezone


class Conversation(models.Model):
    """
    A two-person conversation between any two users (doctor↔patient typically).
    One conversation per pair — enforced via unique_together on sorted IDs.
    """
    participant_one = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_as_one',
    )
    participant_two = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_as_two',
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    # Denormalised for fast list queries
    last_message_at      = models.DateTimeField(null=True, blank=True, db_index=True)
    last_message_preview = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = [('participant_one', 'participant_two')]
        ordering = ['-last_message_at']

    def __str__(self):
        return f"Conversation({self.participant_one_id} ↔ {self.participant_two_id})"

    def other_participant(self, user):
        """Return the participant that is NOT the given user."""
        return self.participant_two if self.participant_one_id == user.pk else self.participant_one

    def unread_count(self, user):
        return self.messages.filter(is_read=False).exclude(sender=user).count()

    @classmethod
    def get_or_create_for_pair(cls, user_a, user_b):
        """Always stores the pair with lower PK first to satisfy unique_together."""
        one, two = (user_a, user_b) if user_a.pk < user_b.pk else (user_b, user_a)
        conv, created = cls.objects.get_or_create(participant_one=one, participant_two=two)
        return conv, created


class Message(models.Model):
    class MessageType(models.TextChoices):
        TEXT  = 'text',  'Text'
        IMAGE = 'image', 'Image'
        FILE  = 'file',  'File'

    conversation  = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    content       = models.TextField(blank=True)
    message_type  = models.CharField(max_length=10, choices=MessageType.choices, default=MessageType.TEXT)
    file          = models.FileField(upload_to='chat/files/', null=True, blank=True)
    file_name     = models.CharField(max_length=255, blank=True)
    is_read       = models.BooleanField(default=False, db_index=True)
    created_at    = models.DateTimeField(auto_now_add=True, db_index=True)
    edited_at     = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message({self.sender_id} → conv {self.conversation_id}: {self.content[:40]})"

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=['is_read'])

    @property
    def file_url(self):
        if self.file:
            try:
                return self.file.url
            except Exception:
                return None
        return None
