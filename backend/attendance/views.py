from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer, BulkAttendanceSerializer

class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all().select_related('student__user')
    serializer_class = AttendanceRecordSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        section_id = self.request.query_params.get('section', None)
        date = self.request.query_params.get('date', None)
        
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        if date:
            queryset = queryset.filter(date=date)
            
        return queryset

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        serializer = BulkAttendanceSerializer(data=request.data)
        if serializer.is_valid():
            section_id = serializer.validated_data['section_id']
            term_id = serializer.validated_data['term_id']
            date = serializer.validated_data['date']
            records_data = serializer.validated_data['records']

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
