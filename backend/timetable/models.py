from django.db import models
from django.core.exceptions import ValidationError
from academics.models import Section, Subject
from users.models import User

class Period(models.Model):
    name = models.CharField(max_length=50) # e.g. "Period 1", "Lunch"
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_break = models.BooleanField(default=False)

    class Meta:
        ordering = ['start_time']

    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')})"

class ClassSchedule(models.Model):
    DAYS_OF_WEEK = [
        ('MON', 'Monday'),
        ('TUE', 'Tuesday'),
        ('WED', 'Wednesday'),
        ('THU', 'Thursday'),
        ('FRI', 'Friday'),
        ('SAT', 'Saturday'),
        ('SUN', 'Sunday'),
    ]

    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='schedules')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'TEACHER'})
    period = models.ForeignKey(Period, on_delete=models.CASCADE)
    day_of_week = models.CharField(max_length=3, choices=DAYS_OF_WEEK)
    room_number = models.CharField(max_length=50, blank=True)

    class Meta:
        unique_together = (
            ('section', 'period', 'day_of_week'),
            ('teacher', 'period', 'day_of_week')
        )
        ordering = ['day_of_week', 'period__start_time']

    def __str__(self):
        return f"{self.section.name} - {self.subject.name} on {self.get_day_of_week_display()} {self.period.name}"

    def clean(self):
        # Additional validation can go here if needed, unique_together handles double booking natively
        pass

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
