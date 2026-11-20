from django.contrib import admin
from .models import Governorate, City

@admin.register(Governorate)
class GovernorateAdmin(admin.ModelAdmin):
    list_display = ("name_en", "name_ar", "slug", "order")
    prepopulated_fields = {"slug": ("name_en",)}

@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name_en", "name_ar", "governorate", "slug", "is_active")
    list_filter  = ("governorate", "is_active")
    prepopulated_fields = {"slug": ("name_en",)}
    search_fields = ("name_en", "name_ar")
