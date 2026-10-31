from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from academics.models import Term, GradeLevel, Section
from sis.models import StudentProfile
from attendance.models import AttendanceRecord

User = get_user_model()


def make_user(username, role, password='pass1234!'):
    return User.objects.create_user(username=username, password=password, role=role, email=f'{username}@example.com')


class DashboardStatsPermissionTests(APITestCase):
    """
    DashboardStatsView had no permission_classes at all, so any authenticated
    role (not just admins, despite the frontend only calling it for ADMIN)
    could read school-wide financial and enrollment aggregates.
    """

    def test_non_admin_cannot_view_dashboard_stats(self):
        student = make_user('student', 'STUDENT')
        self.client.force_authenticate(student)
        resp = self.client.get('/api/dashboard/stats/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_dashboard_stats(self):
        admin = make_user('admin', 'ADMIN')
        self.client.force_authenticate(admin)
        resp = self.client.get('/api/dashboard/stats/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('enrollment', resp.data)


class DashboardTrendTests(APITestCase):
    def setUp(self):
        self.admin = make_user('trendadmin', 'ADMIN')
        student_user = make_user('trendkid', 'STUDENT')
        self.student = StudentProfile.objects.create(user=student_user)

        term = Term.objects.create(name='Term 1', start_date='2026-01-01', end_date='2026-06-01', is_active=True)
        grade_level = GradeLevel.objects.create(name='Grade 9', level_order=9)
        section = Section.objects.create(name='A', grade_level=grade_level)

        self.today = timezone.now().date()
        AttendanceRecord.objects.create(student=self.student, section=section, term=term, date=self.today, status='PRESENT')

    def test_attendance_trend_covers_14_days_and_reflects_todays_record(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/dashboard/stats/?refresh=true')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        trend = resp.data['attendance_trend']
        self.assertEqual(len(trend), 14)
        self.assertEqual(trend[-1]['date'], self.today.isoformat())
        self.assertEqual(trend[-1]['rate'], 100.0)
        # A day with no records at all reports no rate, not a misleading 0%.
        self.assertIsNone(trend[0]['rate'])

    def test_payment_trend_present_in_response(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/dashboard/stats/?refresh=true')
        self.assertIn('payment_trend', resp.data)
