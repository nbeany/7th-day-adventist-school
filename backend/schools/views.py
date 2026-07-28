from rest_framework import viewsets
from .models import SchoolConfig
from .serializers import SchoolConfigSerializer

class SchoolConfigViewSet(viewsets.ModelViewSet):
    queryset = SchoolConfig.objects.all()
    serializer_class = SchoolConfigSerializer
