from django.db import models

class Term(models.Model):
    name = models.CharField(max_length=100) # e.g. "Semester 1", "Term 1"
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class GradeLevel(models.Model):
    name = models.CharField(max_length=50) # e.g. "Grade 9", "Grade 10"
    level_order = models.IntegerField(help_text="Order of the grade level")

    def __str__(self):
        return self.name

class Subject(models.Model):
    name = models.CharField(max_length=100) # e.g. "Mathematics", "English"
    code = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.name

class Section(models.Model):
    name = models.CharField(max_length=50) # e.g. "Section A", "Section B"
    grade_level = models.ForeignKey(GradeLevel, on_delete=models.CASCADE, related_name="sections")
    
    def __str__(self):
        return f"{self.grade_level.name} - {self.name}"
