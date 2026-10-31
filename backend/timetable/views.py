from rest_framework import viewsets
from core.permissions import IsAdminOrReadOnly
from .models import Period, ClassSchedule
from .serializers import PeriodSerializer, ClassScheduleSerializer

class PeriodViewSet(viewsets.ModelViewSet):
    queryset = Period.objects.all()
    serializer_class = PeriodSerializer
    permission_classes = [IsAdminOrReadOnly]

class ClassScheduleViewSet(viewsets.ModelViewSet):
    queryset = ClassSchedule.objects.all().select_related('section', 'subject', 'teacher', 'period')
    serializer_class = ClassScheduleSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        section = self.request.query_params.get('section')
        teacher = self.request.query_params.get('teacher')
        
        if section:
            queryset = queryset.filter(section_id=section)
        if teacher:
            queryset = queryset.filter(teacher_id=teacher)
            
        return queryset
