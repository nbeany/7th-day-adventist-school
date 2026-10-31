from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        TEACHER = 'TEACHER', 'Teacher'
        PARENT = 'PARENT', 'Parent'
        STUDENT = 'STUDENT', 'Student'
        
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    must_change_password = models.BooleanField(
        default=False,
        help_text="Forces the user to set a new password before using the app further (set on bulk-created accounts)."
    )

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
