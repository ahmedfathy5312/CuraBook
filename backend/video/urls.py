"""CuraBook — Video Consultation URLs"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter as DefaultRouter
from .views import VideoSessionViewSet

router = DefaultRouter()
router.register('sessions', VideoSessionViewSet, basename='video-session')

app_name = 'video'
urlpatterns = [path('', include(router.urls))]
