from django.db import models
from sis.models import StudentProfile
from academics.models import Section, Term

class AttendanceRecord(models.Model):
    STATUS_CHOICES = [
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
        ('LATE', 'Late'),
        ('EXCUSED', 'Excused'),
    ]

    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='attendance_records')
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='attendance_records')
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PRESENT')
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('student', 'section', 'date')
        indexes = [
            models.Index(fields=['section', 'date']),
            models.Index(fields=['student', 'term']),
        ]

    def __str__(self):
        return f"{self.student} - {self.date} - {self.status}"
