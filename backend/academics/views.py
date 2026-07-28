from rest_framework import viewsets
from .models import Term, GradeLevel, Subject, Section
from .serializers import TermSerializer, GradeLevelSerializer, SubjectSerializer, SectionSerializer

class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.all()
    serializer_class = TermSerializer

class GradeLevelViewSet(viewsets.ModelViewSet):
    queryset = GradeLevel.objects.all().order_by('level_order')
    serializer_class = GradeLevelSerializer

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer

class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
