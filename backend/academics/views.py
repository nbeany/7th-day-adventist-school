from rest_framework import viewsets
from core.permissions import IsAdminOrReadOnly
from .models import Term, GradeLevel, Subject, Section, SubjectTeacher
from .serializers import TermSerializer, GradeLevelSerializer, SubjectSerializer, SectionSerializer, SubjectTeacherSerializer

class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.all().order_by('-start_date')
    serializer_class = TermSerializer
    permission_classes = [IsAdminOrReadOnly]

class GradeLevelViewSet(viewsets.ModelViewSet):
    queryset = GradeLevel.objects.all().order_by('level_order')
    serializer_class = GradeLevelSerializer
    permission_classes = [IsAdminOrReadOnly]

from django.db import models

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all().order_by('name')
    serializer_class = SubjectSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
            
        section = self.request.query_params.get('section')
        if user.role == 'TEACHER':
            schedule_filter = models.Q(teacher=user)
            if section:
                schedule_filter &= models.Q(section_id=section)
            scheduled_subject_ids = SubjectTeacher.objects.filter(schedule_filter).values_list('subject_id', flat=True)
            qs = qs.filter(id__in=scheduled_subject_ids).distinct()
        return qs

class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all().order_by('grade_level__level_order', 'name')
    serializer_class = SectionSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
            
        if user.role == 'TEACHER':
            scheduled_section_ids = SubjectTeacher.objects.filter(teacher=user).values_list('section_id', flat=True)
            qs = qs.filter(models.Q(homeroom_teacher=user) | models.Q(id__in=scheduled_section_ids)).distinct()
        return qs

class SubjectTeacherViewSet(viewsets.ModelViewSet):
    queryset = SubjectTeacher.objects.all().order_by('id')
    serializer_class = SubjectTeacherSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        section = self.request.query_params.get('section')
        teacher = self.request.query_params.get('teacher')
        
        if section:
            qs = qs.filter(section_id=section)
        if teacher:
            qs = qs.filter(teacher_id=teacher)
            
        return qs

    def create(self, request, *args, **kwargs):
        section_ids = request.data.get('section_ids')
        teacher = request.data.get('teacher')
        subject = request.data.get('subject')

        if section_ids and isinstance(section_ids, list):
            created_count = 0
            for sec_id in section_ids:
                try:
                    SubjectTeacher.objects.get_or_create(
                        teacher_id=teacher,
                        subject_id=subject,
                        section_id=sec_id
                    )
                    created_count += 1
                except Exception:
                    pass
            from rest_framework.response import Response
            from rest_framework import status
            return Response({'message': f'Successfully assigned to {created_count} classes.'}, status=status.HTTP_201_CREATED)
            
        return super().create(request, *args, **kwargs)
