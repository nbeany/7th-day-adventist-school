from rest_framework import viewsets, permissions
from core.permissions import IsAdminOrReadOnly, IsAdmin
from .models import SchoolConfig, Announcement
from .serializers import SchoolConfigSerializer, AnnouncementSerializer
from django.db.models import Q

class SchoolConfigViewSet(viewsets.ModelViewSet):
    queryset = SchoolConfig.objects.all().order_by('id')
    serializer_class = SchoolConfigSerializer
    permission_classes = [IsAdminOrReadOnly]

class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdmin()]

    def get_queryset(self):
        user = self.request.user
        
        if not user.is_authenticated:
            return Announcement.objects.filter(target_audience='ALL').select_related('created_by')
        
        if getattr(user, 'role', '') == 'ADMIN' or user.is_staff:
            return Announcement.objects.all().select_related('created_by')
        
        role_map = {
            'TEACHER': 'TEACHERS',
            'STUDENT': 'STUDENTS',
            'PARENT': 'PARENTS'
        }
        target = role_map.get(getattr(user, 'role', ''), None)
        
        if target:
            return Announcement.objects.filter(
                Q(target_audience='ALL') | Q(target_audience=target)
            ).select_related('created_by')
            
        return Announcement.objects.filter(target_audience='ALL').select_related('created_by')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
