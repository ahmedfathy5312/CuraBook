"""
CuraBook — Scheduling Admin
WorkingHours was removed in migration 0003. Now uses Schedule model.
"""
from django.contrib import admin
from .models import Schedule, TimeOff, GeneratedSlot, BlockedSlot


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display  = ('doctor', 'get_day_of_week_display', 'start_time', 'end_time',
                     'slot_duration', 'clinic', 'hospital', 'is_active')
    list_filter   = ('day_of_week', 'is_active', 'clinic', 'hospital')
    search_fields = ('doctor__username', 'doctor__full_name')
    ordering      = ('doctor', 'day_of_week', 'start_time')


@admin.register(TimeOff)
class TimeOffAdmin(admin.ModelAdmin):
    list_display  = ('doctor', 'start', 'end', 'reason')
    list_filter   = ('doctor',)
    search_fields = ('doctor__username',)


@admin.register(GeneratedSlot)
class GeneratedSlotAdmin(admin.ModelAdmin):
    list_display  = ('doctor', 'start', 'end', 'clinic', 'hospital', 'is_booked', 'is_active')
    list_filter   = ('is_booked', 'is_active', 'clinic', 'hospital')
    search_fields = ('doctor__username',)
    ordering      = ('-start',)


@admin.register(BlockedSlot)
class BlockedSlotAdmin(admin.ModelAdmin):
    list_display  = ('doctor', 'clinic', 'hospital', 'start_date', 'end_date', 'reason', 'created_by')
    list_filter   = ('reason',)
    search_fields = ('doctor__username',)
