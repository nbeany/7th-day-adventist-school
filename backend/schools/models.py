from django.db import models

class SchoolConfig(models.Model):
    name = models.CharField(max_length=255, default="My School")
    logo = models.ImageField(upload_to='school_logos/', null=True, blank=True)
    primary_color = models.CharField(max_length=7, default="#000000")
    secondary_color = models.CharField(max_length=7, default="#FFFFFF")
    principal_signature = models.ImageField(upload_to='signatures/', null=True, blank=True)
    
    class GradingScale(models.TextChoices):
        PERCENTAGE = 'PERCENTAGE', 'Percentage (0-100)'
        GPA = 'GPA', 'GPA (0.0-4.0)'
        LETTER = 'LETTER', 'Letter Grade (A, B, C...)'
        
    grading_scale = models.CharField(max_length=15, choices=GradingScale.choices, default=GradingScale.PERCENTAGE)

    def __str__(self):
        return self.name

class Announcement(models.Model):
    class TargetAudience(models.TextChoices):
        ALL = 'ALL', 'All Community'
        TEACHERS = 'TEACHERS', 'Teachers Only'
        STUDENTS = 'STUDENTS', 'Students Only'
        PARENTS = 'PARENTS', 'Parents Only'

    title = models.CharField(max_length=255)
    content = models.TextField()
    image = models.ImageField(upload_to='announcements/', null=True, blank=True)
    target_audience = models.CharField(max_length=20, choices=TargetAudience.choices, default=TargetAudience.ALL)
    created_by = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='announcements')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
