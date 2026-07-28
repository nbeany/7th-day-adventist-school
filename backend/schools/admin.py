from django.contrib import admin
from .models import SchoolConfig

@admin.register(SchoolConfig)
class SchoolConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'grading_scale')
