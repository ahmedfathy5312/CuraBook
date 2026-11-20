"""
CuraBook — Reviews Selectors
"""
from django.db.models import QuerySet, Avg


def get_reviews_for_doctor(doctor_user) -> QuerySet:
    from reviews.models import Review
    return (
        Review.objects
        .select_related('patient', 'doctor')
        .filter(doctor=doctor_user)
        .order_by('-created_at')
    )


def get_average_rating_for_doctor(doctor_user) -> float | None:
    from reviews.models import Review
    result = Review.objects.filter(doctor=doctor_user).aggregate(avg=Avg('rating'))
    return result['avg']


def get_review_by_id_for_patient(review_id: int, patient) -> 'Review | None':
    from reviews.models import Review
    return Review.objects.filter(pk=review_id, patient=patient).first()
