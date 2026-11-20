from django.urls import path, include
from rest_framework.routers import SimpleRouter as DefaultRouter
from .views import GlobalSearchView, DoctorSearchView, DoctorSlotsView, SearchLogViewSet
from .views_analytics import SearchAnalyticsAPIView  # M-04 FIX: was never registered

app_name = 'search'

router = DefaultRouter()
router.register(r'logs', SearchLogViewSet, basename='search-log')

urlpatterns = [
    path('',          GlobalSearchView.as_view(),      name='global-search'),
    path('doctors/',  DoctorSearchView.as_view(),      name='doctor-search'),
    path('slots/',    DoctorSlotsView.as_view(),       name='doctor-slots'),
    path('analytics/', SearchAnalyticsAPIView.as_view(), name='search-analytics'),  # M-04 FIX: admin-only analytics
    path('',          include(router.urls)),
]
