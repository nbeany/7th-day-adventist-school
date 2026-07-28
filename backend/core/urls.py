from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from rest_framework.routers import DefaultRouter
from academics.views import TermViewSet, GradeLevelViewSet, SubjectViewSet, SectionViewSet
from schools.views import SchoolConfigViewSet
from users.views import UserViewSet

router = DefaultRouter()
router.register(r'terms', TermViewSet)
router.register(r'grade-levels', GradeLevelViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'sections', SectionViewSet)
router.register(r'schools', SchoolConfigViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # App endpoints
    path('api/', include(router.urls)),
]
