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
from academics.views import TermViewSet, GradeLevelViewSet, SubjectViewSet, SectionViewSet, SubjectTeacherViewSet
from schools.views import SchoolConfigViewSet, AnnouncementViewSet
from users.views import UserViewSet
from sis.views import StudentProfileViewSet, GuardianProfileViewSet, StudentGuardianRelationViewSet, StudentEnrollmentViewSet
from attendance.views import AttendanceRecordViewSet
from grades.views import AssignmentViewSet, GradeViewSet, TermGradeViewSet
from finance.views import FeeCategoryViewSet, InvoiceViewSet, PaymentViewSet
from core.dashboard import DashboardStatsView
from timetable.views import PeriodViewSet, ClassScheduleViewSet

router = DefaultRouter()
router.register(r'terms', TermViewSet)
router.register(r'grade-levels', GradeLevelViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'sections', SectionViewSet)
router.register(r'subject-teachers', SubjectTeacherViewSet)
router.register(r'schools', SchoolConfigViewSet)
router.register(r'announcements', AnnouncementViewSet, basename='announcement')
router.register(r'users', UserViewSet)
router.register(r'students', StudentProfileViewSet)
router.register(r'guardians', GuardianProfileViewSet)
router.register(r'student-guardian-relations', StudentGuardianRelationViewSet)
router.register(r'student-enrollments', StudentEnrollmentViewSet)
router.register(r'attendance', AttendanceRecordViewSet)
router.register(r'assignments', AssignmentViewSet)
router.register(r'grades', GradeViewSet)
router.register(r'term-grades', TermGradeViewSet)
router.register(r'fee-categories', FeeCategoryViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'periods', PeriodViewSet)
router.register(r'class-schedules', ClassScheduleViewSet)

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth endpoints
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # App endpoints
    path('api/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
