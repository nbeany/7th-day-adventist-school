from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from core.permissions import IsAdminOrTeacherReadOnly, teacher_has_section_access
from core.csv_export import csv_response
from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer, BulkAttendanceSerializer

class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all().select_related('student__user').order_by('-date', 'id')
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAdminOrTeacherReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return queryset.none()

        if user.role == 'STUDENT':
            queryset = queryset.filter(student__user=user)
        elif user.role == 'PARENT':
            from sis.models import StudentGuardianRelation, GuardianProfile
            try:
                guardian = GuardianProfile.objects.get(user=user)
                child_ids = StudentGuardianRelation.objects.filter(guardian=guardian).values_list('student_id', flat=True)
                queryset = queryset.filter(student_id__in=child_ids)
            except GuardianProfile.DoesNotExist:
                return queryset.none()

        section_id = self.request.query_params.get('section', None)
        date = self.request.query_params.get('date', None)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)

        if section_id:
            queryset = queryset.filter(section_id=section_id)
        if date:
            queryset = queryset.filter(date=date)
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset

    @action(detail=False, methods=['get'])
    def export(self, request):
        queryset = self.get_queryset().select_related('student__user', 'section')
        rows = (
            [r.date, f"{r.student.user.first_name} {r.student.user.last_name}", r.section.name, r.status, r.notes]
            for r in queryset
        )
        return csv_response('attendance_export.csv', ['Date', 'Student', 'Section', 'Status', 'Notes'], rows)

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        serializer = BulkAttendanceSerializer(data=request.data)
        if serializer.is_valid():
            section_id = serializer.validated_data['section_id']
            term_id = serializer.validated_data['term_id']
            date = serializer.validated_data['date']
            records_data = serializer.validated_data['records']

            if not teacher_has_section_access(request.user, section_id):
                return Response(
                    {"error": "You are not the homeroom or a subject teacher for this section."},
                    status=status.HTTP_403_FORBIDDEN
                )

            with transaction.atomic():
                for record_data in records_data:
                    student_id = record_data.get('student_id')
                    status_val = record_data.get('status', 'PRESENT')
                    notes = record_data.get('notes', '')

                    AttendanceRecord.objects.update_or_create(
                        student_id=student_id,
                        section_id=section_id,
                        term_id=term_id,
                        date=date,
                        defaults={
                            'status': status_val,
                            'notes': notes
                        }
                    )
            return Response({"message": "Attendance updated successfully"})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
