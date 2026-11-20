from rest_framework import serializers
from .models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    # FIX: provide both doctor_count (annotated) and doctors_count (frontend alias)
    doctor_count  = serializers.SerializerMethodField()
    doctors_count = serializers.SerializerMethodField()

    class Meta:
        model  = Department
        fields = ("id", "name", "description", "is_active", "doctor_count", "doctors_count")

    def get_doctor_count(self, obj):
        # Support both annotated and reverse relation
        if hasattr(obj, "_doctor_count"):
            return obj._doctor_count
        try:
            return obj.department_doctors.filter(is_active=True).count()
        except Exception:
            return 0

    def get_doctors_count(self, obj):
        return self.get_doctor_count(obj)
