from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from users.serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

from rest_framework.routers import DefaultRouter
from academics.views import TermViewSet, GradeLevelViewSet, SubjectViewSet, SectionViewSet
from schools.views import SchoolConfigViewSet
from users.views import UserViewSet
from sis.views import StudentProfileViewSet, GuardianProfileViewSet, StudentGuardianRelationViewSet, StudentEnrollmentViewSet
from attendance.views import AttendanceRecordViewSet

router = DefaultRouter()
router.register(r'terms', TermViewSet)
router.register(r'grade-levels', GradeLevelViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'sections', SectionViewSet)
router.register(r'schools', SchoolConfigViewSet)
router.register(r'users', UserViewSet)
router.register(r'students', StudentProfileViewSet)
router.register(r'guardians', GuardianProfileViewSet)
router.register(r'student-guardian-relations', StudentGuardianRelationViewSet)
router.register(r'student-enrollments', StudentEnrollmentViewSet)
router.register(r'attendance', AttendanceRecordViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth endpoints
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # App endpoints
    path('api/', include(router.urls)),
]
