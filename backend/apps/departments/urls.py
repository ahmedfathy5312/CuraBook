from django.urls import path, include
from rest_framework.routers import SimpleRouter as DefaultRouter
from .views import DepartmentViewSet

app_name = "departments"
router = DefaultRouter()
router.register(r"", DepartmentViewSet, basename="department")
urlpatterns = [path("", include(router.urls))]
