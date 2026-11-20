# clinics/admin.py
from django.contrib import admin
from django.core.exceptions import ValidationError
from .models import Clinic, ClinicStaff
from apps.doctors.models import DoctorProfile

# ==================================================
# Clinic Staff Inline (لـ ClinicAdmin)
# ==================================================
class ClinicStaffInline(admin.TabularInline):
    model = ClinicStaff
    fk_name = 'clinic'  # يجب أن يكون FK إلى parent model
    extra = 0
    readonly_fields = ('created_at',)
    autocomplete_fields = ('user',)
    fields = ('user', 'role', 'is_active', 'created_at')
    can_delete = True
    verbose_name = "Clinic Staff Member"
    verbose_name_plural = "Clinic Staff Members"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user', 'clinic')


# ==================================================
# Clinic Admin
# ==================================================
@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner_user','is_active', 'created_at')
    search_fields = ('name', 'owner__user__username', 'owner__user__email', 'hospital__name')
    list_filter = ('is_active', 'hospital')
    readonly_fields = ('slug', 'created_at', 'updated_at')
    autocomplete_fields = ('owner', 'hospital')
    ordering = ('name',)
    inlines = [ClinicStaffInline]  # Inline مرتبط بالـ Clinic

    def owner_user(self, obj):
        return obj.owner.user.username
    owner_user.short_description = "Doctor Owner"

    def save_model(self, request, obj, form, change):
        # التأكد أن الـ owner هو DoctorProfile
        if not isinstance(obj.owner, DoctorProfile):
            raise ValidationError("Owner must be a DoctorProfile")
        super().save_model(request, obj, form, change)


# ==================================================
# ClinicStaff Admin
# ==================================================
@admin.register(ClinicStaff)
class ClinicStaffAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'clinic', 'is_active', 'created_at')
    search_fields = ('user__username', 'user__email', 'clinic__name', 'role')
    list_filter = ('role', 'is_active', 'clinic')
    autocomplete_fields = ('user', 'clinic')
    ordering = ('clinic', 'role')

    def save_model(self, request, obj, form, change):
        # منع إضافة دكتور كـ staff
        if getattr(obj.user, 'is_doctor', False):
            raise ValidationError("Doctor cannot be assigned as clinic staff")
        super().save_model(request, obj, form, change)
 