from rest_framework import serializers
from .models import StudentProfile, GuardianProfile, StudentGuardianRelation, StudentEnrollment
from users.serializers import UserSerializer
from academics.serializers import SectionSerializer, TermSerializer

class GuardianProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)

    student_relations = serializers.SerializerMethodField()

    class Meta:
        model = GuardianProfile
        fields = '__all__'

    def get_student_relations(self, obj):
        return [{
            "id": rel.student.id,
            "first_name": rel.student.user.first_name,
            "last_name": rel.student.user.last_name,
            "is_primary": rel.is_primary_contact
        } for rel in obj.student_relations.all()]

    def create(self, validated_data):
        user_id = validated_data.pop('user_id', None)
        if user_id:
            validated_data['user_id'] = user_id
        return super().create(validated_data)

class StudentGuardianRelationSerializer(serializers.ModelSerializer):
    guardian_detail = GuardianProfileSerializer(source='guardian', read_only=True)

    class Meta:
        model = StudentGuardianRelation
        fields = '__all__'

class StudentEnrollmentSerializer(serializers.ModelSerializer):
    section_name = serializers.CharField(source='section.name', read_only=True)
    term_name = serializers.CharField(source='term.name', read_only=True)

    class Meta:
        model = StudentEnrollment
        fields = '__all__'

class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    guardian_relations = StudentGuardianRelationSerializer(many=True, read_only=True)
    enrollments = StudentEnrollmentSerializer(many=True, read_only=True)

    class Meta:
        model = StudentProfile
        fields = '__all__'

    def create(self, validated_data):
        user_id = validated_data.pop('user_id', None)
        if user_id:
            validated_data['user_id'] = user_id
        return super().create(validated_data)
