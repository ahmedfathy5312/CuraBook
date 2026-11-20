from django.urls import path
from .views import HealthView, HealthDBView, HealthRedisView, HealthCeleryView

app_name = 'health'

urlpatterns = [
    path('',        HealthView.as_view(),       name='health'),
    path('db/',     HealthDBView.as_view(),     name='health-db'),
    path('redis/',  HealthRedisView.as_view(),  name='health-redis'),
    path('celery/', HealthCeleryView.as_view(), name='health-celery'),
]
