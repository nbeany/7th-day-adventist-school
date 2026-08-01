from django.db import models
from django.conf import settings
from academics.models import Section, Term

class StudentProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_profile')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=[('M', 'Male'), ('F', 'Female'), ('O', 'Other')], null=True, blank=True)
    address = models.TextField(blank=True)
    medical_notes = models.TextField(blank=True)
    admission_date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} ({self.user.username})"

class GuardianProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='guardian_profile')
    relationship_to_student = models.CharField(max_length=50, blank=True)
    emergency_contact_number = models.CharField(max_length=20, blank=True)
    occupation = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}"

class StudentGuardianRelation(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='guardian_relations')
    guardian = models.ForeignKey(GuardianProfile, on_delete=models.CASCADE, related_name='student_relations')
    is_primary_contact = models.BooleanField(default=False)

    class Meta:
        unique_together = ('student', 'guardian')

    def __str__(self):
        return f"{self.guardian} -> {self.student}"

class StudentEnrollment(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='enrollments')
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='enrolled_students')
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='enrollments')
    enrollment_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('ACTIVE', 'Active'), ('DROPPED', 'Dropped'), ('COMPLETED', 'Completed')], default='ACTIVE')

    class Meta:
        unique_together = ('student', 'section', 'term')

    def __str__(self):
        return f"{self.student} in {self.section.name} ({self.term.name})"
