from django.contrib import admin
from .models import (
    Hospital,
    # Department is intentionally NOT imported here.
    # FIX BUG-05: Department is re-exported from apps.departments.models in hospital/models.py.
    # It is already registered in apps/departments/admin.py.
    # Importing + re-registering it here causes django.contrib.admin.exceptions.AlreadyRegistered.
    HospitalDoctor,
    HospitalAssistant,
    HospitalStaff,
    HospitalAdmin,      # Link between User & Hospital
    HospitalDocument
)


# ==================================================
# Hospital Admin
# ==================================================
@admin.register(Hospital)
class HospitalModelAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'get_admin_email',
        'get_admin_phone',
        'is_active',
        'created_at'
    )
    list_filter = ('is_active', 'created_at')
    search_fields = ('name',)
    prepopulated_fields = {"slug": ("name",)}
    ordering = ('name',)

    def get_admin_email(self, obj):
        admin_link = obj.admins.select_related('user').first()
        if admin_link and admin_link.user:
            return admin_link.user.email
        return '-'
    get_admin_email.short_description = "Admin Email"

    def get_admin_phone(self, obj):
        admin_link = obj.admins.select_related('user').first()
        if admin_link and admin_link.user:
            return admin_link.user.phone
        return '-'
    get_admin_phone.short_description = "Admin Phone"


# ==================================================
# Hospital Doctor Admin
# ==================================================
@admin.register(HospitalDoctor)
class HospitalDoctorAdmin(admin.ModelAdmin):
    list_display = ('get_username', 'hospital', 'department', 'is_active')
    list_filter = ('hospital', 'department', 'is_active')
    search_fields = (
        'user__username',
        'user__full_name',
        'hospital__name',
        'department__name'
    )
    ordering = ('hospital', 'department', 'user__username')

    def get_username(self, obj):
        return obj.user.username
    get_username.short_description = 'Username'


# ==================================================
# Hospital Staff Admin
# ==================================================
@admin.register(HospitalStaff)
class HospitalStaffAdmin(admin.ModelAdmin):
    list_display = ('get_username', 'hospital', 'role')
    list_filter = ('hospital', 'role')
    search_fields = ('user__username', 'hospital__name', 'role')
    ordering = ('hospital', 'role', 'user__username')

    def get_username(self, obj):
        return obj.user.username
    get_username.short_description = 'Username'


# ==================================================
# Hospital Assistant Admin
# ==================================================
@admin.register(HospitalAssistant)
class HospitalAssistantAdmin(admin.ModelAdmin):
    list_display = ('get_assistant', 'hospital', 'role', 'is_active', 'assigned_at')
    list_filter = ('hospital', 'role', 'is_active', 'assigned_at')
    search_fields = (
        'assistant__user__username',
        'assistant__user__full_name',
        'assistant__user__email',
        'hospital__name',
        'role',
    )
    ordering = ('hospital', 'role', 'assistant__user__username')
    autocomplete_fields = ('assistant', 'hospital')

    def get_assistant(self, obj):
        user = obj.assistant.user
        return getattr(user, 'full_name', '') or getattr(user, 'username', '')
    get_assistant.short_description = 'Assistant'


# ==================================================
# Hospital Admins (Link Model)
# ==================================================
@admin.register(HospitalAdmin)
class HospitalAdminLinkAdmin(admin.ModelAdmin):
    list_display = ('get_username', 'hospital')
    list_filter = ('hospital',)
    search_fields = ('user__username', 'hospital__name')
    ordering = ('hospital', 'user__username')

    def get_username(self, obj):
        return obj.user.username if obj.user else '-'
    get_username.short_description = 'Username'


# ==================================================
# Hospital Documents Admin
# ==================================================
@admin.register(HospitalDocument)
class HospitalDocumentAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'uploaded_by', 'hospital', 'uploaded_at')
    list_filter = ('hospital', 'uploaded_at')
    search_fields = ('file', 'uploaded_by__username', 'hospital__name')
    ordering = ('-uploaded_at',)

    def file_name(self, obj):
        return obj.file.name.split('/')[-1]
    file_name.short_description = 'File Name'
