from django.contrib import admin
from .models import AttendanceRecord

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('student', 'section', 'date', 'status')
    list_filter = ('status', 'date', 'section')
    search_fields = ('student__user__username', 'student__user__first_name', 'student__user__last_name')
    date_hierarchy = 'date'
