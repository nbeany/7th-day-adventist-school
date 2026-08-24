from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db import transaction
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

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
            
        if user.role == 'STUDENT':
            queryset = queryset.filter(user=user)
        elif user.role == 'PARENT':
            try:
                guardian = GuardianProfile.objects.get(user=user)
                child_ids = StudentGuardianRelation.objects.filter(guardian=guardian).values_list('student_id', flat=True)
                queryset = queryset.filter(id__in=child_ids)
            except GuardianProfile.DoesNotExist:
                return queryset.none()
        return queryset

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def register(self, request):
        User = get_user_model()
        user_data = request.data.get('user', {})
        profile_data = request.data.get('profile', {})

        if not all(k in user_data for k in ('username', 'password', 'first_name', 'last_name')):
            return Response({"error": "Missing required user fields (username, password, first_name, last_name)"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=user_data['username'],
            password=user_data['password'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            email=user_data.get('email', ''),
            role='STUDENT'
        )

        profile_data['user_id'] = user.id
        serializer = self.get_serializer(data=profile_data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

class GuardianProfileViewSet(viewsets.ModelViewSet):
    queryset = GuardianProfile.objects.all().select_related('user').prefetch_related('student_relations__student__user')
    serializer_class = GuardianProfileSerializer

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def register(self, request):
        User = get_user_model()
        user_data = request.data.get('user', {})
        profile_data = request.data.get('profile', {})

        if not all(k in user_data for k in ('username', 'password', 'first_name', 'last_name')):
            return Response({"error": "Missing required user fields (username, password, first_name, last_name)"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=user_data['username'],
            password=user_data['password'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            email=user_data.get('email', ''),
            role='PARENT'
        )

        profile_data['user_id'] = user.id
        serializer = self.get_serializer(data=profile_data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

class StudentGuardianRelationViewSet(viewsets.ModelViewSet):
    queryset = StudentGuardianRelation.objects.all()
    serializer_class = StudentGuardianRelationSerializer

class StudentEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = StudentEnrollment.objects.all()
    serializer_class = StudentEnrollmentSerializer
