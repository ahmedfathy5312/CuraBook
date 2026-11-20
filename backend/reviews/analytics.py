from .models import Review
from django.contrib.auth import get_user_model
User = get_user_model()
from hospital.models import Hospital
from clinics.models import Clinic

def get_review_analytics():
    return {
        "total_reviews": Review.objects.count(),
        "average_rating": Review.objects.aggregate(avg=models.Avg('rating'))['avg'] or 0,
        "reviews_per_doctor": Review.objects.values('doctor').annotate(count=models.Count('id')).order_by('-count'),
        "reviews_per_hospital": Review.objects.values('hospital').annotate(count=models.Count('id')).order_by('-count'),
        "reviews_per_clinic": Review.objects.values('clinic').annotate(count=models.Count('id')).order_by('-count'),
    }
