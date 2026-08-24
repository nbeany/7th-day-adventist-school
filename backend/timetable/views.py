from rest_framework import viewsets
from .models import Period, ClassSchedule
from .serializers import PeriodSerializer, ClassScheduleSerializer

class PeriodViewSet(viewsets.ModelViewSet):
    queryset = Period.objects.all()
    serializer_class = PeriodSerializer

class ClassScheduleViewSet(viewsets.ModelViewSet):
    queryset = ClassSchedule.objects.all().select_related('section', 'subject', 'teacher', 'period')
    serializer_class = ClassScheduleSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        section = self.request.query_params.get('section')
        teacher = self.request.query_params.get('teacher')
        
        if section:
            queryset = queryset.filter(section_id=section)
        if teacher:
            queryset = queryset.filter(teacher_id=teacher)
            
        return queryset
