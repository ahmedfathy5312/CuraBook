"""
CuraBook — Appointments Serializers
======================================
Serializers validate INPUT STRUCTURE only:
  • Type checks, required fields, cross-field FK consistency

Slot availability checks (is_booked, past date, race condition) live in:
    appointments/services.py  →  book_appointment()

This separation means:
  • The API gives clear 400 errors for malformed requests (serializer)
  • Race conditions and booking conflicts are caught atomically (service + select_for_update)
"""

from rest_framework import serializers
from .models import Appointment, AppointmentHistory
from scheduling.models import GeneratedSlot


# ─────────────────────────────────────────────────────────────────────────────
# SlotSummarySerializer  (lightweight — used for reschedule_slot_detail)
# ─────────────────────────────────────────────────────────────────────────────

class SlotSummarySerializer(serializers.ModelSerializer):
    """Lightweight read-only serializer for reschedule_slot FK."""
    class Meta:
        model  = GeneratedSlot
        fields = ('id', 'start', 'end', 'is_booked')
        read_only_fields = fields


# ─────────────────────────────────────────────────────────────────────────────
# AppointmentHistorySerializer  (read-only)
# ─────────────────────────────────────────────────────────────────────────────

class AppointmentHistorySerializer(serializers.ModelSerializer):
    changed_by_username = serializers.CharField(
        source="changed_by.username",
        read_only=True,
        default=None,
    )
    # MED-05 FIX: AppointmentHistory inherits TimestampedModel which has `created_at`,
    # not `changed_at`. DRF was silently returning null for `changed_at`.
    # Map changed_at → created_at so the field works correctly.
    changed_at = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model            = AppointmentHistory
        fields           = (
            "id", "old_status", "new_status",
            "changed_by", "changed_by_username",
            "note", "changed_at",
        )
        read_only_fields = fields


# ─────────────────────────────────────────────────────────────────────────────
# AppointmentSerializer  (create / retrieve)
# ─────────────────────────────────────────────────────────────────────────────

class AppointmentSerializer(serializers.ModelSerializer):
    history = AppointmentHistorySerializer(many=True, read_only=True)
    slot = serializers.PrimaryKeyRelatedField(
        queryset=GeneratedSlot.objects.all(),
        required=False,
    )
    slot_id = serializers.IntegerField(write_only=True, required=False)

    # F-02 FIX: nested read-only representation of the reschedule slot FK
    reschedule_slot_detail = SlotSummarySerializer(source='reschedule_slot', read_only=True)

    class Meta:
        model  = Appointment
        fields = (
            "public_id",   # ✅ UUID — safe for API (no sequential enumeration)
            "id",          # integer — internal/admin use only
            "hospital", "clinic", "doctor", "patient", "slot", "slot_id",
            "visit_type", "status", "reason", "rejection_reason",
            "reschedule_slot", "reschedule_reason", "reschedule_slot_detail",  # F-02 FIX
            "expires_at", "created_at", "updated_at",
            "history",
        )
        read_only_fields = (
            "status", "rejection_reason", "expires_at",
            "created_at", "updated_at",
            "patient",   # set from request.user in view
            "reschedule_slot_detail",  # F-02 FIX
        )

    # ── Structural Validation (not availability — that's the service's job) ──

    def validate(self, attrs: dict) -> dict:
        slot     = attrs.get("slot")
        slot_id  = attrs.pop("slot_id", None)
        doctor   = attrs.get("doctor")
        clinic   = attrs.get("clinic")
        hospital = attrs.get("hospital")

        if slot_id is not None:
            try:
                slot_from_id = GeneratedSlot.objects.get(pk=slot_id)
            except GeneratedSlot.DoesNotExist:
                raise serializers.ValidationError(
                    {"slot_id": "This slot does not exist."}
                )
            if slot and slot.id != slot_from_id.id:
                raise serializers.ValidationError(
                    {"slot_id": "slot and slot_id must refer to the same slot."}
                )
            slot = slot_from_id
            attrs["slot"] = slot

        if not slot:
            raise serializers.ValidationError(
                {"slot_id": "Please select a time slot."}
            )

        # Slot → Doctor consistency
        if slot and doctor and slot.doctor_id != doctor.id:
            raise serializers.ValidationError(
                {"slot": "This slot does not belong to this doctor."}
            )

        # Location exclusivity
        if clinic and hospital:
            raise serializers.ValidationError(
                "Must specify a clinic or hospital — not both."
            )

        # Slot → Location consistency
        if slot:
            if clinic and slot.clinic_id != clinic.id:
                raise serializers.ValidationError(
                    {
                        "slot": "This slot belongs to a different clinic. Please go back and choose a slot from the selected clinic.",
                        "user_message": "slot_clinic_mismatch",
                    }
                )
            if hospital and slot.hospital_id != hospital.id:
                raise serializers.ValidationError(
                    {
                        "slot": "This slot belongs to a different hospital. Please go back and choose a valid slot.",
                        "user_message": "slot_hospital_mismatch",
                    }
                )

        # Doctor -> Location consistency
        if hospital and doctor:
            try:
                linked = doctor.hospital_doctor_links.filter(
                    hospital=hospital,
                    is_active=True,
                ).exists()
            except Exception:
                linked = False
            if not linked:
                raise serializers.ValidationError(
                    {"hospital": "This doctor is not linked to this hospital."}
                )

        if clinic and doctor:
            try:
                profile = getattr(doctor, "doctor_profile", None)
                owns_clinic = bool(
                    profile
                    and clinic.owner_id == profile.id
                    and clinic.is_active
                    and not clinic.is_deleted
                )
            except Exception:
                owns_clinic = False
            if not owns_clinic:
                raise serializers.ValidationError(
                    {"clinic": "This clinic does not belong to this doctor."}
                )

        return attrs

    def to_representation(self, instance) -> dict:
        data = super().to_representation(instance)
        data["status_display"]     = instance.get_status_display()
        data["visit_type_display"] = instance.get_visit_type_display()
        data["is_expired"]         = instance.is_expired()
        data["location_type"]      = "clinic" if instance.clinic_id else "hospital"
        return data


# ─────────────────────────────────────────────────────────────────────────────
# AppointmentListSerializer  (lightweight — list endpoints)
# ─────────────────────────────────────────────────────────────────────────────

class AppointmentListSerializer(serializers.ModelSerializer):
    doctor_name      = serializers.CharField(source="doctor.full_name", read_only=True)
    doctor_name_en   = serializers.CharField(source="doctor.full_name_en", read_only=True, default=None)
    doctor_specialty = serializers.CharField(source="doctor.doctor_profile.specialty", read_only=True)
    patient_name     = serializers.CharField(source="patient.full_name", read_only=True)
    slot_start       = serializers.DateTimeField(source="slot.start", read_only=True)
    slot_end         = serializers.DateTimeField(source="slot.end", read_only=True)
    location         = serializers.SerializerMethodField()
    # FIX: frontend uses appt.date, appt.time, appt.slot_time, appt.location_type, appt.phone
    date             = serializers.SerializerMethodField()
    time             = serializers.SerializerMethodField()
    slot_time        = serializers.SerializerMethodField()
    location_type    = serializers.SerializerMethodField()
    phone            = serializers.SerializerMethodField()
    # VIDEO-FIX (v34): expose video_session_id so frontend can show Start Video button
    video_session_id = serializers.SerializerMethodField()
    # Include doctor image for avatar display
    doctor_image     = serializers.SerializerMethodField()
    hospital_name    = serializers.CharField(source="hospital.name", read_only=True, default=None)

    class Meta:
        model  = Appointment
        # API-M01 FIX: "id" (sequential integer) removed from list view.
        # Clients must use "public_id" (UUID) — prevents enumeration attacks.
        fields = (
            "id",          # integer pk — needed for cancel/reschedule API calls
            "public_id",
            "doctor_name", "doctor_name_en", "doctor_specialty", "patient_name",
            "slot_start", "slot_end", "location",
            "date", "time", "slot_time", "location_type", "phone",
            "visit_type", "status", "created_at",
            "video_session_id", "doctor_image", "hospital_name",
        )

    def get_location(self, obj):
        if obj.clinic:
            return {"type": "clinic", "name": obj.clinic.name, "id": obj.clinic.id}
        if obj.hospital:
            return {"type": "hospital", "name": obj.hospital.name, "id": obj.hospital.id}
        return None

    def get_date(self, obj):
        try:
            return obj.slot.start.date().isoformat() if obj.slot else None
        except Exception:
            return None

    def get_time(self, obj):
        try:
            return obj.slot.start.isoformat() if obj.slot else None
        except Exception:
            return None

    def get_slot_time(self, obj):
        return self.get_time(obj)

    def get_location_type(self, obj):
        if obj.hospital_id:
            return "hospital"
        if obj.clinic_id:
            return "clinic"
        return None

    def get_phone(self, obj):
        try:
            return getattr(obj.patient, "phone", None)
        except Exception:
            return None

    def get_video_session_id(self, obj):
        """Return the video session UUID if this appointment has an associated video session."""
        try:
            session = getattr(obj, 'video_session', None)
            if session:
                return str(session.id)
        except Exception:
            pass
        return None

    def get_doctor_image(self, obj):
        """Return doctor profile picture URL if available."""
        try:
            profile = getattr(obj.doctor, 'doctor_profile', None)
            if profile and getattr(profile, 'profile_picture', None):
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.profile_picture.url)
                return str(profile.profile_picture.url)
        except Exception:
            pass
        return None


# ─────────────────────────────────────────────────────────────────────────────
# AppointmentDetailSerializer  (full detail — single appointment endpoints)
# FIX BUG-07: was missing — analytics/doctor_urls.py imports this
# ─────────────────────────────────────────────────────────────────────────────

class AppointmentDetailSerializer(serializers.ModelSerializer):
    """
    Full detail serializer for GET /doctor/appointments/{id}/ and similar.
    Includes history, patient info, doctor info, slot details, and location.
    """
    history          = AppointmentHistorySerializer(many=True, read_only=True)
    doctor_name      = serializers.CharField(source="doctor.full_name", read_only=True)
    doctor_name_en   = serializers.CharField(source="doctor.full_name_en", read_only=True, default=None)
    doctor_specialty = serializers.CharField(
        source="doctor.doctor_profile.specialty", read_only=True
    )
    patient_name     = serializers.CharField(source="patient.full_name", read_only=True)
    patient_email    = serializers.EmailField(source="patient.email", read_only=True)
    slot_start       = serializers.DateTimeField(source="slot.start", read_only=True)
    slot_end         = serializers.DateTimeField(source="slot.end", read_only=True)
    location         = serializers.SerializerMethodField()
    hospital_name    = serializers.CharField(source="hospital.name", read_only=True, default=None)

    class Meta:
        model  = Appointment
        fields = (
            "public_id", "id",
            "doctor", "doctor_name", "doctor_name_en", "doctor_specialty",
            "patient", "patient_name", "patient_email",
            "slot", "slot_start", "slot_end",
            "hospital", "clinic", "location", "hospital_name",
            "visit_type", "status",
            "reason", "rejection_reason",
            "session_notes",
            "expires_at", "created_at", "updated_at",
            "history",
        )
        read_only_fields = fields

    def get_location(self, obj) -> dict | None:
        if obj.clinic:
            return {"type": "clinic", "name": obj.clinic.name, "id": obj.clinic.id}
        if obj.hospital:
            return {"type": "hospital", "name": obj.hospital.name, "id": obj.hospital.id}
        return None

    def to_representation(self, instance) -> dict:
        data = super().to_representation(instance)
        data["status_display"]     = instance.get_status_display()
        data["visit_type_display"] = instance.get_visit_type_display()
        return data
