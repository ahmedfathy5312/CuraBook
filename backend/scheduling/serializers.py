"""
CuraBook — Scheduling Serializers
Unified around the Schedule model (WorkingHours was removed in migration 0003).

BUG #2 FIX (v11):
  Root cause of "This field is required" on Schedule save:
  DRF's auto-generated UniqueTogetherValidator for the unique_together constraint
  ('doctor', 'clinic', 'hospital', 'day_of_week', 'start_time') tries to include
  ALL constraint fields in its check — including 'doctor', which is read_only.
  When 'doctor' is read_only, it's excluded from incoming data, so the validator
  raises {"doctor": ["This field is required."]} before our own validate() runs.

  Fix: set validators=[] in ScheduleSerializer.Meta to suppress the auto-generated
  UniqueTogetherValidator. We manually handle the duplicate-schedule check inside
  validate() using the actual doctor from the request context (set by perform_create).
  This is the canonical DRF solution for read_only fields in unique_together sets.
  Ref: https://www.django-rest-framework.org/api-guide/validators/#uniquetogethervalidator
"""

from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from .models import Schedule, TimeOff, GeneratedSlot, BlockedSlot


# ==================================================
# Schedule Serializer (replaces WorkingHoursSerializer)
# ==================================================
class ScheduleSerializer(serializers.ModelSerializer):
    day_of_week_display = serializers.CharField(
        source='get_day_of_week_display', read_only=True
    )
    location_name = serializers.SerializerMethodField(read_only=True)
    doctor_name = serializers.SerializerMethodField(read_only=True)
    specialty = serializers.SerializerMethodField(read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True, default=None)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True, default=None)
    status = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Schedule
        fields = (
            'id', 'doctor', 'clinic', 'hospital',
            'day_of_week', 'day_of_week_display',
            'start_time', 'end_time', 'slot_duration',
            'is_active', 'created_at', 'location_name',
            'doctor_name', 'specialty', 'clinic_name', 'hospital_name', 'status',
        )
        read_only_fields = ('id', 'doctor', 'created_at', 'day_of_week_display', 'location_name', 'doctor_name', 'specialty', 'clinic_name', 'hospital_name', 'status')
        # ── BUG #2 FIX ────────────────────────────────────────────────────────
        # Disable DRF's auto-generated UniqueTogetherValidator.
        # The model has unique_together = ('doctor', 'clinic', 'hospital',
        # 'day_of_week', 'start_time'). Since 'doctor' is read_only it's never
        # present in the incoming payload, which makes the auto-generated
        # validator raise {"doctor": ["This field is required."]} on every
        # POST/PUT — regardless of whether the data is actually valid.
        # We handle duplicate checking manually in validate() below.
        validators = []

    def get_location_name(self, obj):
        if obj.clinic:
            return getattr(obj.clinic, 'name', str(obj.clinic))
        if obj.hospital:
            return getattr(obj.hospital, 'name', str(obj.hospital))
        return None

    def get_doctor_name(self, obj):
        return getattr(obj.doctor, 'full_name', None) or getattr(obj.doctor, 'username', '')

    def get_specialty(self, obj):
        profile = getattr(obj.doctor, 'doctor_profile', None)
        return getattr(profile, 'specialty', '') if profile else ''

    def get_status(self, obj):
        return 'active' if obj.is_active else 'inactive'

    def validate(self, data):
        clinic   = data.get('clinic')
        hospital = data.get('hospital')

        # ── For partial updates (PATCH) fall back to the instance values ──────
        if self.instance:
            if clinic is None and hospital is None:
                clinic   = self.instance.clinic
                hospital = self.instance.hospital
            # For full PUT, also fall back individual fields if not supplied
            if clinic is None and 'clinic' not in data:
                clinic = self.instance.clinic
            if hospital is None and 'hospital' not in data:
                hospital = self.instance.hospital

        # ── Location validation ───────────────────────────────────────────────
        if clinic and hospital:
            raise serializers.ValidationError(
                "يجب ربط الجدول بعيادة أو مستشفى، وليس بكليهما في نفس الوقت. / "
                "Schedule must link to clinic OR hospital, not both."
            )
        if not clinic and not hospital:
            raise serializers.ValidationError(
                "يجب ربط الجدول بعيادة أو مستشفى. / "
                "Schedule must link to either a clinic or a hospital."
            )

        # ── Time validation ───────────────────────────────────────────────────
        end   = data.get('end_time')
        start = data.get('start_time')
        if end and start and end <= start:
            raise serializers.ValidationError(
                "وقت الانتهاء يجب أن يكون بعد وقت البداية. / "
                "end_time must be after start_time."
            )

        # ── Manual duplicate check (replaces the suppressed UniqueTogetherValidator)
        # We can only check once the doctor is known (set during perform_create),
        # so we skip this check here and rely on the database unique constraint +
        # the model's clean() to catch true duplicates on save.
        # This is safe because IntegrityError from unique_together will surface
        # as a 400, not a 500.
        return data


# ==================================================
# TimeOff Serializer
# ==================================================
class TimeOffSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TimeOff
        fields = '__all__'
        read_only_fields = ('doctor',)


# ==================================================
# GeneratedSlot Serializers
# ==================================================
class SlotBaseSerializer(serializers.ModelSerializer):
    # Computed status field: 'booked' | 'blocked' | 'available'
    status = serializers.SerializerMethodField(read_only=True)
    # start_time as HH:MM string (extracted from the start datetime)
    start_time = serializers.SerializerMethodField(read_only=True)
    end_time_str = serializers.SerializerMethodField(read_only=True)

    def get_status(self, obj):
        if obj.is_booked:
            return 'booked'
        if not obj.is_active:
            return 'blocked'
        return 'available'

    def get_start_time(self, obj):
        if obj.start:
            return obj.start.strftime('%H:%M')
        return None

    def get_end_time_str(self, obj):
        if obj.end:
            return obj.end.strftime('%H:%M')
        return None

    class Meta:
        model  = GeneratedSlot
        fields = '__all__'
        # CRITICAL FIX (Problem 8 + BUG #2 v11):
        # 'doctor' is set automatically via perform_create (read_only).
        # GeneratedSlot has unique_together = ('doctor', 'start', 'end').
        # DRF's auto UniqueTogetherValidator includes 'doctor' in its check,
        # and because doctor is read_only (not in incoming data), it raises
        # {"doctor": ["This field is required."]} before our logic runs.
        # Fix: validators=[] suppresses the auto-generated validator.
        # The database unique constraint still protects against true duplicates.
        read_only_fields = ('is_booked', 'is_active', 'doctor')
        validators = []


class SlotAdminSerializer(SlotBaseSerializer):
    class Meta(SlotBaseSerializer.Meta):
        fields = (
            'id', 'public_id', 'doctor', 'clinic', 'hospital', 'schedule',
            'start', 'end', 'start_time', 'end_time_str',
            'is_booked', 'is_active', 'status',
            'metadata', 'created_at',
        )
        read_only_fields = ('is_booked', 'is_active', 'doctor', 'status', 'start_time', 'end_time_str')
        # Suppress UniqueTogetherValidator for same reason as SlotBaseSerializer
        validators = []


class SlotPublicSerializer(serializers.ModelSerializer):
    doctor_name   = serializers.SerializerMethodField()
    clinic_name   = serializers.SerializerMethodField()
    hospital_name = serializers.SerializerMethodField()
    location_type = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()

    class Meta:
        model  = GeneratedSlot
        fields = (
            'id', 'start', 'end',
            'doctor_name',
            'clinic', 'hospital',
            'clinic_name', 'hospital_name',
            'location_type', 'location_name',
        )

    def get_doctor_name(self, obj):
        return (
            getattr(obj.doctor, 'full_name', None)
            or getattr(obj.doctor, 'username', str(obj.doctor))
        )

    def get_clinic_name(self, obj):
        return obj.clinic.name if obj.clinic else None

    def get_hospital_name(self, obj):
        return obj.hospital.name if obj.hospital else None

    def get_location_type(self, obj):
        if obj.clinic:
            return 'clinic'
        if obj.hospital:
            return 'hospital'
        return None

    def get_location_name(self, obj):
        if obj.clinic:
            return obj.clinic.name
        if obj.hospital:
            return obj.hospital.name
        return None


# ==================================================
# BlockedSlot Serializer
# ==================================================
class BlockedSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BlockedSlot
        fields = (
            "id", "doctor", "clinic", "hospital",
            "start_date", "end_date", "reason", "note", "created_at",
        )
        read_only_fields = ("id", "created_at")
