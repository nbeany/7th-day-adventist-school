from django.contrib import admin
from .models import StudentProfile, GuardianProfile, StudentGuardianRelation, StudentEnrollment

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'gender', 'date_of_birth', 'admission_date')
    search_fields = ('user__username', 'user__first_name', 'user__last_name')
    list_filter = ('gender',)

@admin.register(GuardianProfile)
class GuardianProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'relationship_to_student', 'emergency_contact_number', 'occupation')
    search_fields = ('user__username', 'user__first_name', 'user__last_name')

@admin.register(StudentGuardianRelation)
class StudentGuardianRelationAdmin(admin.ModelAdmin):
    list_display = ('student', 'guardian', 'is_primary_contact')
    list_filter = ('is_primary_contact',)

@admin.register(StudentEnrollment)
class StudentEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'section', 'term', 'status', 'enrollment_date')
    list_filter = ('status', 'term')
    search_fields = ('student__user__username', 'student__user__first_name')
