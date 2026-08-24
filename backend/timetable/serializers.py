from rest_framework import serializers
from .models import Period, ClassSchedule

class PeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Period
        fields = '__all__'

class ClassScheduleSerializer(serializers.ModelSerializer):
    section_name = serializers.CharField(source='section.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.SerializerMethodField(read_only=True)
    period_detail = PeriodSerializer(source='period', read_only=True)

    class Meta:
        model = ClassSchedule
        fields = '__all__'

    def get_teacher_name(self, obj):
        return f"{obj.teacher.first_name} {obj.teacher.last_name}"

    def validate(self, attrs):
        # Allow partial updates to pass if they don't include all 3 fields, but they usually do.
        teacher = attrs.get('teacher') or (self.instance.teacher if self.instance else None)
        subject = attrs.get('subject') or (self.instance.subject if self.instance else None)
        section = attrs.get('section') or (self.instance.section if self.instance else None)

        if teacher and subject and section:
            from academics.models import SubjectTeacher
            if not SubjectTeacher.objects.filter(teacher=teacher, subject=subject, section=section).exists():
                raise serializers.ValidationError("This teacher is not assigned to teach this subject in this section. Please update Course Assignments first.")
        
        return attrs
