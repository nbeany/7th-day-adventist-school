from django.db import models

class SchoolConfig(models.Model):
    name = models.CharField(max_length=255, default="My School")
    logo = models.ImageField(upload_to='school_logos/', null=True, blank=True)
    primary_color = models.CharField(max_length=7, default="#000000")
    secondary_color = models.CharField(max_length=7, default="#FFFFFF")
    
    class GradingScale(models.TextChoices):
        PERCENTAGE = 'PERCENTAGE', 'Percentage (0-100)'
        GPA = 'GPA', 'GPA (0.0-4.0)'
        LETTER = 'LETTER', 'Letter Grade (A, B, C...)'
        
    grading_scale = models.CharField(max_length=15, choices=GradingScale.choices, default=GradingScale.PERCENTAGE)

    def __str__(self):
        return self.name
