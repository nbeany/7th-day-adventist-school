from rest_framework import viewsets
from .models import StudentProfile, GuardianProfile, StudentGuardianRelation, StudentEnrollment
from .serializers import (
    StudentProfileSerializer, 
    GuardianProfileSerializer, 
    StudentGuardianRelationSerializer,
    StudentEnrollmentSerializer
)

class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all().select_related('user').prefetch_related('guardian_relations__guardian__user', 'enrollments__section', 'enrollments__term')
    serializer_class = StudentProfileSerializer

class GuardianProfileViewSet(viewsets.ModelViewSet):
    queryset = GuardianProfile.objects.all().select_related('user')
    serializer_class = GuardianProfileSerializer

class StudentGuardianRelationViewSet(viewsets.ModelViewSet):
    queryset = StudentGuardianRelation.objects.all()
    serializer_class = StudentGuardianRelationSerializer

class StudentEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = StudentEnrollment.objects.all()
    serializer_class = StudentEnrollmentSerializer
