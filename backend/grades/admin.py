from django.contrib import admin
from .models import Assignment, Grade, TermGrade

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'section', 'term', 'max_score', 'weight', 'date')
    list_filter = ('term', 'subject', 'section')
    search_fields = ('name',)

@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ('student', 'assignment', 'score')
    list_filter = ('assignment__term', 'assignment__subject')
    search_fields = ('student__user__first_name', 'student__user__last_name')

@admin.register(TermGrade)
class TermGradeAdmin(admin.ModelAdmin):
    list_display = ('student', 'subject', 'term', 'final_score', 'letter_grade')
    list_filter = ('term', 'subject')
    search_fields = ('student__user__first_name', 'student__user__last_name')
