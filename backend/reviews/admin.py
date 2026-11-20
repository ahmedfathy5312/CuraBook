from django.contrib import admin
from django.utils.html import format_html
from django.urls import path
from django.shortcuts import render
from django.db.models import Avg, Count
from .models import Review
from hospital.models import Hospital
from clinics.models import Clinic
from django.contrib.auth import get_user_model
User = get_user_model()

class ReviewAnalyticsAdmin(admin.ModelAdmin):
    change_list_template = "appReview/dashboard.html"  # template must exist at templates/appReview/dashboard.html

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('dashboard/', self.admin_site.admin_view(self.dashboard_view), name='reviews_dashboard'),
        ]
        return custom_urls + urls

    def dashboard_view(self, request):
        # Latest 10 reviews
        latest_reviews = Review.objects.select_related('doctor', 'patient', 'clinic', 'hospital').order_by('-created_at')[:10]

        # Average rating per doctor
        doctor_ratings = Review.objects.values('doctor__id', 'doctor__full_name').annotate(avg_rating=Avg('rating'), total=Count('id')).order_by('-avg_rating')

        # Average rating per hospital
        hospital_ratings = Review.objects.values('hospital__id', 'hospital__name').annotate(avg_rating=Avg('rating'), total=Count('id')).order_by('-avg_rating')

        # Average rating per clinic
        clinic_ratings = Review.objects.values('clinic__id', 'clinic__name').annotate(avg_rating=Avg('rating'), total=Count('id')).order_by('-avg_rating')

        context = {
            **self.admin_site.each_context(request),
            'latest_reviews': latest_reviews,
            'doctor_ratings': doctor_ratings,
            'hospital_ratings': hospital_ratings,
            'clinic_ratings': clinic_ratings,
        }
        return render(request, "appReview/dashboard.html", context)


admin.site.register(Review, ReviewAnalyticsAdmin)
