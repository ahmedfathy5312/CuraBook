from rest_framework import serializers
from .models import DoctorProfile
from apps.accounts.serializers import UserSerializer


class DoctorProfileSerializer(serializers.ModelSerializer):
    user         = UserSerializer(read_only=True)
    avg_rating   = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)

    class Meta:
        model  = DoctorProfile
        fields = "__all__"
        read_only_fields = ("slug", "user")


class DoctorProfileUpdateSerializer(serializers.ModelSerializer):
    """For doctor updating their own profile."""
    experience_years = serializers.IntegerField(read_only=True)

    class Meta:
        model  = DoctorProfile
        fields = (
            "specialty", "bio", "consultation_fee",
            "accepts_booking", "gender", "date_of_birth", "slot_duration",
            "start_of_practice_date", "experience_years",
            "education", "languages",
            "certificates", "profile_image", "cover_image",
        )


# ─────────────────────────────────────────────────────────────
# Full Doctor Profile — used by GET /api/v1/doctors/{id}/
# Returns everything the frontend booking page needs:
#   doctor_info, clinics, hospital_affiliations,
#   schedules, rating_summary
# ─────────────────────────────────────────────────────────────

class ClinicSummarySerializer(serializers.Serializer):
    id      = serializers.IntegerField()
    name    = serializers.CharField()
    slug    = serializers.CharField()
    address = serializers.CharField()
    city    = serializers.CharField(required=False)
    phone   = serializers.CharField(required=False)


class HospitalAffiliationSerializer(serializers.Serializer):
    hospital_id   = serializers.IntegerField(source="hospital.id")
    hospital_name = serializers.CharField(source="hospital.name")
    department    = serializers.SerializerMethodField()
    role          = serializers.CharField(required=False)

    def get_department(self, obj):
        dept = getattr(obj, "department", None)
        if dept:
            return {"id": dept.id, "name": dept.name}
        return None


class ScheduleSummarySerializer(serializers.Serializer):
    id             = serializers.IntegerField()
    day_of_week    = serializers.IntegerField()
    day_name       = serializers.SerializerMethodField()
    start_time     = serializers.TimeField()
    end_time       = serializers.TimeField()
    slot_duration  = serializers.IntegerField()
    location_type  = serializers.SerializerMethodField()
    location_name  = serializers.SerializerMethodField()

    def get_day_name(self, obj):
        DAYS = {0: "Saturday", 1: "Sunday", 2: "Monday", 3: "Tuesday",
                4: "Wednesday", 5: "Thursday", 6: "Friday"}
        return DAYS.get(obj.day_of_week, "")

    def get_location_type(self, obj):
        if getattr(obj, "clinic", None):
            return "clinic"
        if getattr(obj, "hospital", None):
            return "hospital"
        return None

    def get_location_name(self, obj):
        if getattr(obj, "clinic", None):
            return obj.clinic.name
        if getattr(obj, "hospital", None):
            return obj.hospital.name
        return None


class RatingSummarySerializer(serializers.Serializer):
    avg_rating    = serializers.FloatField()
    review_count  = serializers.IntegerField()
    rating_1      = serializers.IntegerField()
    rating_2      = serializers.IntegerField()
    rating_3      = serializers.IntegerField()
    rating_4      = serializers.IntegerField()
    rating_5      = serializers.IntegerField()


class DoctorFullProfileSerializer(serializers.ModelSerializer):
    """
    Complete doctor profile for the booking page.
    Returned by GET /api/v1/doctors/{id}/
    """
    user                  = UserSerializer(read_only=True)
    clinics               = serializers.SerializerMethodField()
    hospital_affiliations = serializers.SerializerMethodField()
    schedules             = serializers.SerializerMethodField()
    rating_summary        = serializers.SerializerMethodField()
    avg_rating            = serializers.FloatField(read_only=True)
    review_count          = serializers.IntegerField(read_only=True)
    # FIX H-06: frontend reads doctor?.clinic_id / doctor?.hospital_id directly
    clinic_id             = serializers.SerializerMethodField()
    hospital_id           = serializers.SerializerMethodField()
    # FIX: flattened convenience fields for frontend (doctor.name, doctor.image etc)
    name                  = serializers.SerializerMethodField()
    full_name             = serializers.SerializerMethodField()
    # FIX G: Expose full_name_en so frontend getLocalizedName() can render Latin name in EN mode
    full_name_en          = serializers.SerializerMethodField()
    image                 = serializers.SerializerMethodField()
    rating                = serializers.SerializerMethodField()
    reviews_count         = serializers.SerializerMethodField()
    clinic_name           = serializers.SerializerMethodField()
    clinic_address        = serializers.SerializerMethodField()
    clinic_phone          = serializers.SerializerMethodField()
    hospital_name         = serializers.SerializerMethodField()
    hospital_address      = serializers.SerializerMethodField()

    class Meta:
        model  = DoctorProfile
        fields = "__all__"
        read_only_fields = ("slug", "user")

    def get_name(self, obj):
        return obj.user.full_name or obj.user.username

    def get_full_name(self, obj):
        return obj.user.full_name or obj.user.username

    def get_full_name_en(self, obj):
        # FIX G: Return English name if set; otherwise fall back to username (usually Latin)
        return obj.user.full_name_en or obj.user.username or obj.user.full_name

    def get_image(self, obj):
        return obj.profile_image

    def get_rating(self, obj):
        rs = self.get_rating_summary(obj)
        return rs.get("avg_rating", 0)

    def get_reviews_count(self, obj):
        rs = self.get_rating_summary(obj)
        return rs.get("review_count", 0)

    def get_clinic_name(self, obj):
        from clinics.models import Clinic
        c = Clinic.objects.filter(owner=obj, is_active=True).first()
        return c.name if c else None

    def get_clinic_address(self, obj):
        from clinics.models import Clinic
        c = Clinic.objects.filter(owner=obj, is_active=True).first()
        return c.address if c else None

    def get_clinic_phone(self, obj):
        from clinics.models import Clinic
        c = Clinic.objects.filter(owner=obj, is_active=True).first()
        return getattr(c, "phone", None) if c else None

    def get_hospital_name(self, obj):
        link = obj.user.hospital_doctor_links.filter(is_active=True).select_related("hospital").first()
        return link.hospital.name if link else None

    def get_hospital_address(self, obj):
        link = obj.user.hospital_doctor_links.filter(is_active=True).select_related("hospital").first()
        return getattr(link.hospital, "address", None) if link else None

    def get_clinic_id(self, obj):
        """Primary clinic ID (first owned clinic) — used by booking page."""
        from clinics.models import Clinic
        clinic = Clinic.objects.filter(owner=obj, is_active=True).first()
        return clinic.id if clinic else None

    def get_hospital_id(self, obj):
        """Primary hospital ID (first active affiliation) — used by booking page."""
        link = (
            obj.user.hospital_doctor_links
            .filter(is_active=True)
            .select_related("hospital")
            .first()
        )
        return link.hospital.id if link else None

    def get_clinics(self, obj):
        """All clinics this doctor owns or works at."""
        from clinics.models import Clinic
        clinics = (
            Clinic.objects
            .filter(owner=obj, is_active=True)
            .values("id", "name", "slug", "address", "city", "phone")
        )
        return list(clinics)

    def get_hospital_affiliations(self, obj):
        """All hospitals this doctor is affiliated with."""
        links = (
            obj.user.hospital_doctor_links
            .select_related("hospital", "department")
            .filter(is_active=True)
        )
        result = []
        for link in links:
            dept = getattr(link, "department", None)
            result.append({
                "hospital_id":   link.hospital.id,
                "hospital_name": link.hospital.name,
                "department":    {"id": dept.id, "name": dept.name} if dept else None,
                "role":          getattr(link, "role", None),
            })
        return result

    def get_schedules(self, obj):
        """All active schedules."""
        schedules = (
            obj.user.schedules
            .select_related("clinic", "hospital")
            .filter(is_active=True)
            .order_by("day_of_week", "start_time")
        )
        return ScheduleSummarySerializer(schedules, many=True).data

    def get_rating_summary(self, obj):
        """Detailed rating breakdown for the booking UI star widget."""
        from django.db.models import Count
        reviews_qs = obj.user.reviews_received
        aggregated = reviews_qs.values("rating").annotate(count=Count("rating"))
        breakdown = {i: 0 for i in range(1, 6)}
        for row in aggregated:
            breakdown[row["rating"]] = row["count"]
        total = sum(breakdown.values())
        avg   = (
            sum(k * v for k, v in breakdown.items()) / total
            if total else 0.0
        )
        return {
            "avg_rating":   round(avg, 2),
            "review_count": total,
            "rating_1":     breakdown[1],
            "rating_2":     breakdown[2],
            "rating_3":     breakdown[3],
            "rating_4":     breakdown[4],
            "rating_5":     breakdown[5],
        }
