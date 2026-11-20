from django.urls import path
from rest_framework.routers import SimpleRouter as DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .views import (
    ReviewListView,
    ReviewDetailView,
    ReviewCreateView,
    ReviewUpdateView,
    ReviewDeleteView,
    MyReviewsView,        # ✅ will be added
)

app_name = 'reviews'

urlpatterns = [
    # ✅ FIX: removed 'reviews/' prefix — main urls.py already prefixes with /api/v1/reviews/
    path('',                        ReviewListView.as_view(),   name='review-list'),
    path('<int:pk>/',               ReviewDetailView.as_view(), name='review-detail'),
    path('create/',                 ReviewCreateView.as_view(), name='review-create'),
    path('<int:pk>/update/',        ReviewUpdateView.as_view(), name='review-update'),
    path('<int:pk>/delete/',        ReviewDeleteView.as_view(), name='review-delete'),
    # ✅ NEW: GET /api/v1/reviews/my/ — patient sees own reviews
    path('my/',                     MyReviewsView.as_view(),    name='my-reviews'),
    # ── BUG 2+3 FIX ──────────────────────────────────────────────────────────
    # Frontend apiRoutes.js REVIEWS.UPDATE and REVIEWS.DELETE both point to
    # /api/v1/reviews/{id}/ (standard REST) but backend only had /{id}/update/
    # and /{id}/delete/ (non-standard). ReviewDetailView handles PATCH + DELETE
    # on the same /{id}/ endpoint, so these two aliases make it work both ways.
    # Old paths (<int:pk>/update/ and <int:pk>/delete/) are kept for compatibility.
]
