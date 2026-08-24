from rest_framework import serializers
from .models import Term, GradeLevel, Subject, Section, SubjectTeacher

class TermSerializer(serializers.ModelSerializer):
    class Meta:
        model = Term
        fields = '__all__'

class GradeLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeLevel
        fields = '__all__'

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'

class SectionSerializer(serializers.ModelSerializer):
    homeroom_teacher_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Section
        fields = '__all__'

    def get_homeroom_teacher_name(self, obj):
        if obj.homeroom_teacher:
            return f"{obj.homeroom_teacher.first_name} {obj.homeroom_teacher.last_name}"
        return None

class SubjectTeacherSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField(read_only=True)
    subject_name = serializers.ReadOnlyField(source='subject.name')
    section_name = serializers.ReadOnlyField(source='section.name')

    class Meta:
        model = SubjectTeacher
        fields = '__all__'

    def get_teacher_name(self, obj):
        return f"{obj.teacher.first_name} {obj.teacher.last_name}"
