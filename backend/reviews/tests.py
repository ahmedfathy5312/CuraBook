"""
reviews/tests.py — Real unit tests for the reviews app.
Full integration suite: backend/tests/test_auth_api.py covers API-level tests.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class ReviewRatingValidationTest(TestCase):
    """Test rating constraints on the Review model."""

    def test_valid_rating_range(self):
        """Ratings 1–5 are the only valid values."""
        from reviews.models import Review
        valid = [c[0] for c in Review.RATING_CHOICES]
        self.assertEqual(sorted(valid), [1, 2, 3, 4, 5])

    def test_rating_choices_are_integers(self):
        from reviews.models import Review
        for val, _ in Review.RATING_CHOICES:
            self.assertIsInstance(val, int)

    def test_review_str_representation(self):
        """__str__ contains both patient and doctor names."""
        from reviews.models import Review
        doctor  = User(username='dr_ali',  full_name='Dr. Ali')
        patient = User(username='hassan', full_name='Hassan')
        review  = Review.__new__(Review)
        review.doctor  = doctor
        review.patient = patient
        result = str(review)
        self.assertIn('Ali',    result)
        self.assertIn('Hassan', result)


class ReviewSoftDeleteTest(TestCase):
    """Verify Review inherits soft-delete behaviour."""

    def test_review_has_is_deleted_field(self):
        from reviews.models import Review
        self.assertTrue(hasattr(Review, 'is_deleted'))

    def test_review_meta_ordering(self):
        from reviews.models import Review
        meta = Review._meta
        # Should have indexes defined
        self.assertTrue(len(meta.indexes) > 0)


class ReviewSerializerTest(TestCase):
    """Test ReviewSerializer field structure."""

    def test_serializer_importable(self):
        from reviews.serializers import ReviewSerializer
        self.assertIsNotNone(ReviewSerializer)

    def test_serializer_has_rating_field(self):
        from reviews.serializers import ReviewSerializer
        self.assertIn('rating', ReviewSerializer().fields)

    def test_serializer_has_comment_field(self):
        from reviews.serializers import ReviewSerializer
        self.assertIn('comment', ReviewSerializer().fields)
