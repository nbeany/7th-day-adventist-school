from django.db import models
from sis.models import StudentProfile
from academics.models import Subject, Section, Term

class Assignment(models.Model):
    name = models.CharField(max_length=200)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='assignments')
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='assignments')
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='assignments')
    max_score = models.DecimalField(max_digits=6, decimal_places=2, default=100)
    weight = models.DecimalField(max_digits=4, decimal_places=2, default=1.0, help_text="Weight for grade aggregation (e.g. 0.30 = 30%)")
    date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-date', 'name']

    def __str__(self):
        return f"{self.name} ({self.subject.name} - {self.section.name})"

class Grade(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='grades')
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='grades')
    score = models.DecimalField(max_digits=6, decimal_places=2)
    comment = models.TextField(blank=True)

    class Meta:
        unique_together = ('student', 'assignment')

    def __str__(self):
        return f"{self.student} - {self.assignment.name}: {self.score}/{self.assignment.max_score}"

class TermGrade(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='term_grades')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='term_grades')
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='term_grades')
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='term_grades')
    final_score = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    letter_grade = models.CharField(max_length=5, blank=True)
    teacher_comment = models.TextField(blank=True)

    class Meta:
        unique_together = ('student', 'subject', 'term')

    def __str__(self):
        return f"{self.student} - {self.subject.name} ({self.term.name}): {self.final_score} ({self.letter_grade})"
