from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from core.permissions import IsAdminOrReadOnly
from academics.models import Section, Term
from audit.models import AuditLog
from .models import StudentProfile, GuardianProfile, StudentGuardianRelation, StudentEnrollment
from .serializers import (
    StudentProfileSerializer,
    GuardianProfileSerializer,
    StudentGuardianRelationSerializer,
    StudentEnrollmentSerializer
)

class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all().select_related('user').prefetch_related('guardian_relations__guardian__user', 'enrollments__section', 'enrollments__term').order_by('id')
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAdminOrReadOnly]

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

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) | Q(user__last_name__icontains=search) |
                Q(user__username__icontains=search)
            )
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
    queryset = GuardianProfile.objects.all().select_related('user').prefetch_related('student_relations__student__user').order_by('id')
    serializer_class = GuardianProfileSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return queryset.none()

        if user.role == 'PARENT':
            queryset = queryset.filter(user=user)
        elif user.role == 'STUDENT':
            try:
                student = StudentProfile.objects.get(user=user)
                guardian_ids = StudentGuardianRelation.objects.filter(student=student).values_list('guardian_id', flat=True)
                queryset = queryset.filter(id__in=guardian_ids)
            except StudentProfile.DoesNotExist:
                return queryset.none()

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) | Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search)
            )
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
            role='PARENT'
        )

        profile_data['user_id'] = user.id
        serializer = self.get_serializer(data=profile_data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

class StudentGuardianRelationViewSet(viewsets.ModelViewSet):
    queryset = StudentGuardianRelation.objects.all().order_by('id')
    serializer_class = StudentGuardianRelationSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return queryset.none()

        if user.role == 'STUDENT':
            queryset = queryset.filter(student__user=user)
        elif user.role == 'PARENT':
            queryset = queryset.filter(guardian__user=user)
        return queryset

class StudentEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = StudentEnrollment.objects.all().order_by('id')
    serializer_class = StudentEnrollmentSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return queryset.none()

        if user.role == 'STUDENT':
            queryset = queryset.filter(student__user=user)
        elif user.role == 'PARENT':
            try:
                guardian = GuardianProfile.objects.get(user=user)
                child_ids = StudentGuardianRelation.objects.filter(guardian=guardian).values_list('student_id', flat=True)
                queryset = queryset.filter(student_id__in=child_ids)
            except GuardianProfile.DoesNotExist:
                return queryset.none()
        return queryset

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def promote(self, request):
        """
        Bulk year-end promotion: moves every actively-enrolled student in
        `from_section_id` into `to_section_id`/`to_term_id`. Their old
        enrollment is marked COMPLETED (not deleted) so attendance/grade
        history stays attached to it; pass `student_ids` to promote only a
        subset instead of the whole class.
        """
        from_section_id = request.data.get('from_section_id')
        to_section_id = request.data.get('to_section_id')
        to_term_id = request.data.get('to_term_id')
        student_ids = request.data.get('student_ids')

        if not all([from_section_id, to_section_id, to_term_id]):
            return Response(
                {"error": "from_section_id, to_section_id, and to_term_id are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not Section.objects.filter(id=to_section_id).exists():
            return Response({"error": "Target section not found."}, status=status.HTTP_404_NOT_FOUND)
        if not Term.objects.filter(id=to_term_id).exists():
            return Response({"error": "Target term not found."}, status=status.HTTP_404_NOT_FOUND)

        enrollments = StudentEnrollment.objects.filter(section_id=from_section_id, status='ACTIVE')
        if student_ids:
            enrollments = enrollments.filter(student_id__in=student_ids)

        promoted_ids = []
        for enrollment in enrollments:
            enrollment.status = 'COMPLETED'
            enrollment.save()
            StudentEnrollment.objects.update_or_create(
                student_id=enrollment.student_id,
                section_id=to_section_id,
                term_id=to_term_id,
                defaults={'status': 'ACTIVE'}
            )
            promoted_ids.append(enrollment.student_id)

        AuditLog.objects.log(
            request.user, 'enrollment.promote',
            object_repr=f"section {from_section_id} -> {to_section_id}, term {to_term_id}",
            from_section_id=from_section_id, to_section_id=to_section_id, to_term_id=to_term_id,
            student_count=len(promoted_ids)
        )
        return Response({
            "message": f"Promoted {len(promoted_ids)} student(s).",
            "promoted_student_ids": promoted_ids
        })
