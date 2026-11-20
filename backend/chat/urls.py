"""
chat/urls.py
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter as DefaultRouter
from .views import ConversationViewSet

app_name = 'chat'

router = DefaultRouter()
router.register('conversations', ConversationViewSet, basename='conversation')

# Custom action routes (router doesn't auto-wire detail actions with same URL)
conversation_messages = ConversationViewSet.as_view({
    'get':  'messages',
    'post': 'send_message',
})
conversation_read = ConversationViewSet.as_view({'post': 'read'})

urlpatterns = [
    path('', include(router.urls)),
    path('conversations/<int:pk>/messages/', conversation_messages, name='conversation-messages'),
    path('conversations/<int:pk>/read/',     conversation_read,     name='conversation-read'),
]