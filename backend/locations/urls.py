from django.urls import path
from .views import CitiesListView

app_name = "locations"

urlpatterns = [
    path("cities/", CitiesListView.as_view(), name="cities-list"),
]
