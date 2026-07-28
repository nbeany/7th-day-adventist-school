from django.contrib import admin
from .models import Term, GradeLevel, Subject, Section

@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active',)

@admin.register(GradeLevel)
class GradeLevelAdmin(admin.ModelAdmin):
    list_display = ('name', 'level_order')
    ordering = ('level_order',)

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'code')

@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'grade_level')
    list_filter = ('grade_level',)
