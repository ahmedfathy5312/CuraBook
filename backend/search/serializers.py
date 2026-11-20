from rest_framework import serializers
from apps.doctors.models import DoctorProfile
from scheduling.models import GeneratedSlot
from .models import SearchLog
from django.utils import timezone


class DoctorSearchSerializer(serializers.ModelSerializer):
    """Lightweight doctor result for search listing."""
    name              = serializers.CharField(source='user.full_name')
    name_en           = serializers.CharField(source='user.full_name_en', read_only=True, default=None)
    username          = serializers.CharField(source='user.username')
    city              = serializers.CharField(source='user.city')
    avg_rating        = serializers.FloatField(read_only=True)
    review_count      = serializers.IntegerField(read_only=True)
    consultation_fee  = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    clinic_name       = serializers.SerializerMethodField()
    clinic_id         = serializers.SerializerMethodField()
    hospital_name     = serializers.SerializerMethodField()
    user_id           = serializers.IntegerField(source='user.id', read_only=True)
    locations         = serializers.SerializerMethodField()
    hospital_id       = serializers.SerializerMethodField()   # BUG#1 FIX: was missing — DoctorCard needs it to pass to BookingPage URL
    # FIX: aliases used by DoctorCard on frontend
    image             = serializers.CharField(source='profile_image', read_only=True)
    rating            = serializers.FloatField(source='avg_rating', read_only=True)
    reviews_count     = serializers.IntegerField(source='review_count', read_only=True)
    # Section 4 Fix: expose availability fields so DoctorCard can show green pulse / "متاح اليوم"
    is_available_today   = serializers.SerializerMethodField()
    next_available_date  = serializers.SerializerMethodField()

    class Meta:
        model  = DoctorProfile
        fields = (
            'id', 'name', 'name_en', 'username', 'specialty', 'bio',
            'city', 'avg_rating', 'review_count',
            'rating', 'reviews_count', 'image',
            'consultation_fee', 'slug',
            'user_id',
            'clinic_name', 'clinic_id', 'hospital_name', 'hospital_id',
            'locations',
            'accepts_booking', 'experience_years', 'profile_image',
            # Section 4 Fix: new availability fields
            'is_available_today', 'next_available_date',
        )

    def get_hospital_name(self, obj):
        """First active hospital this doctor belongs to."""
        try:
            link = obj.user.hospital_doctor_links.filter(
                hospital__is_active=True
            ).select_related('hospital').first()
            return link.hospital.name if link else None
        except Exception:
            return None

    def get_hospital_id(self, obj):
        """BUG#1 FIX: Return the hospital ID so DoctorCard can pass it to BookingPage URL."""
        try:
            link = obj.user.hospital_doctor_links.filter(
                hospital__is_active=True
            ).select_related('hospital').first()
            return link.hospital.id if link else None
        except Exception:
            return None

    def get_clinic_name(self, obj):
        try:
            clinic = obj.clinics_owned.filter(is_active=True).first()
            return clinic.name if clinic else None
        except Exception:
            return None

    def get_clinic_id(self, obj):
        try:
            clinic = obj.clinics_owned.filter(is_active=True).first()
            return clinic.id if clinic else None
        except Exception:
            return None

    def get_locations(self, obj):
        """Return all bookable places for a doctor: private clinics and hospitals."""
        locations = []

        try:
            for clinic in obj.clinics_owned.filter(is_active=True):
                locations.append({
                    'type': 'clinic',
                    'id': clinic.id,
                    'name': clinic.name,
                    'city': getattr(clinic, 'city', None),
                    'fee': str(getattr(clinic, 'consultation_price', None) or obj.consultation_fee or ''),
                })
        except Exception:
            pass

        try:
            links = obj.user.hospital_doctor_links.filter(
                hospital__is_active=True,
                is_active=True,
            ).select_related('hospital')
            for link in links:
                locations.append({
                    'type': 'hospital',
                    'id': link.hospital.id,
                    'name': link.hospital.name,
                    'city': getattr(link.hospital, 'city', None),
                    'fee': str(obj.consultation_fee or ''),
                })
        except Exception:
            pass

        return locations

    def get_is_available_today(self, obj):
        """Section 4 Fix: return True if doctor has at least one free slot today."""
        try:
            now = timezone.now()
            today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            return obj.user.slots.filter(
                start__gte=now,
                start__lte=today_end,
                is_booked=False,
                is_active=True,
            ).exists()
        except Exception:
            return False

    def get_next_available_date(self, obj):
        """Section 4 Fix: return ISO date string of the next free slot (or None)."""
        try:
            now = timezone.now()
            slot = obj.user.slots.filter(
                start__gte=now,
                is_booked=False,
                is_active=True,
            ).order_by('start').first()
            return slot.start.date().isoformat() if slot else None
        except Exception:
            return None


class SlotSerializer(serializers.ModelSerializer):
    location_name = serializers.SerializerMethodField()
    location_type = serializers.SerializerMethodField()

    class Meta:
        model  = GeneratedSlot
        fields = (
            'id', 'start', 'end',
            'is_booked', 'is_active',
            'location_name', 'location_type',
        )

    def get_location_name(self, obj):
        if obj.clinic:   return obj.clinic.name
        if obj.hospital: return obj.hospital.name
        return None

    def get_location_type(self, obj):
        if obj.clinic:   return 'clinic'
        if obj.hospital: return 'hospital'
        return None


class SearchResultSerializer(serializers.Serializer):
    """Polymorphic serializer for global search results."""
    type     = serializers.CharField()
    instance = serializers.SerializerMethodField()

    def get_instance(self, obj):
        from clinics.serializers import ClinicSerializer
        from hospital.serializers import HospitalSerializer

        t   = obj['type']
        ins = obj['instance']

        if t == 'doctor':
            return DoctorSearchSerializer(ins, context=self.context).data
        if t == 'clinic':
            return ClinicSerializer(ins, context=self.context).data
        if t == 'hospital':
            return HospitalSerializer(ins, context=self.context).data
        return str(ins)


class SearchLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SearchLog
        fields = '__all__'
        read_only_fields = fields
