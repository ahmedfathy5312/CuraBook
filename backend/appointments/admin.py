# appointments/admin.py
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.utils.html import format_html

from .models import Appointment, AppointmentHistory
from .archive_models import AppointmentArchive


# ==================================================
# Appointment History Inline
# ==================================================
class AppointmentHistoryInline(admin.TabularInline):
    model = AppointmentHistory
    extra = 0
    readonly_fields = (
        'old_status',
        'new_status',
        'changed_by',
        'note',
        'created_at',
    )
    can_delete = False


# ==================================================
# Appointment Admin
# ==================================================
@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'patient',
        'doctor',
        'clinic',
        'hospital',
        'status',
        'created_at',
    )
    list_filter = (
        'status',
        'clinic',
        'hospital',
        'doctor',
    )
    search_fields = (
        'patient__username',
        'doctor__username',
        'clinic__name',
        'hospital__name',
    )
    autocomplete_fields = (
        'patient',
        'doctor',
        'clinic',
        'hospital',
        'slot',
    )
    readonly_fields = (
        'created_at',
        'updated_at',
        'expires_at',
    )
    ordering = ('-created_at',)
    inlines = [AppointmentHistoryInline]

    def save_model(self, request, obj, form, change):
        # تشغيل validation القوي من model.clean()
        try:
            obj.clean()
        except ValidationError as e:
            raise ValidationError(e)
        super().save_model(request, obj, form, change)


# ==================================================
# Appointment History Admin (اختياري)
# ==================================================
@admin.register(AppointmentHistory)
class AppointmentHistoryAdmin(admin.ModelAdmin):
    list_display = (
        'appointment',
        'old_status',
        'new_status',
        'changed_by',
        'created_at',
    )
    list_filter = ('new_status',)
    search_fields = ('appointment__id',)
    readonly_fields = (
        'appointment',
        'old_status',
        'new_status',
        'changed_by',
        'note',
        'created_at',
    )


# ==================================================
# AppointmentArchive Admin  (FIX B-10)
# Registers cold-storage archive table in Django admin
# so staff can browse/search archived appointments.
# ==================================================
@admin.register(AppointmentArchive)
class AppointmentArchiveAdmin(admin.ModelAdmin):
    list_display = (
        'original_appointment_id',
        'patient_id',
        'doctor_id',
        'final_status_badge',
        'appointment_created_at',
        'archived_at',
    )
    list_filter  = ('final_status', 'archived_at')
    search_fields = (
        'original_appointment_id',
        'patient_id',
        'doctor_id',
        'final_status',
    )
    readonly_fields = (
        'id',
        'original_appointment_id',
        'original_public_id',
        'patient_id',
        'doctor_id',
        'final_status',
        'snapshot',
        'appointment_created_at',
        'archived_at',
    )
    ordering = ('-archived_at',)
    date_hierarchy = 'archived_at'

    # Prevent any accidental edits — archive rows are immutable
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        # Only superusers can delete archived medical records
        return request.user.is_superuser

    @admin.display(description='Status')
    def final_status_badge(self, obj):
        colors = {
            'completed': '#31A870',
            'cancelled': '#E97D61',
        }
        color = colors.get(obj.final_status.lower(), '#6B7280')
        return format_html(
            '<span style="background:{}20;color:{};padding:2px 10px;border-radius:99px;font-size:12px;font-weight:700;">{}</span>',
            color, color, obj.final_status.upper()
        )
