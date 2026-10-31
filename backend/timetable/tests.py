from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Period

User = get_user_model()


def make_user(username, role, password='pass1234!'):
    return User.objects.create_user(username=username, password=password, role=role, email=f'{username}@example.com')


class TimetablePermissionTests(APITestCase):
    def setUp(self):
        self.admin = make_user('admin', 'ADMIN')
        self.teacher = make_user('teacher', 'TEACHER')
        self.student = make_user('student', 'STUDENT')

    def test_any_authenticated_role_can_read_periods(self):
        Period.objects.create(name='Period 1', start_time='08:00', end_time='09:00')
        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/periods/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_teacher_cannot_create_period(self):
        self.client.force_authenticate(self.teacher)
        resp = self.client.post('/api/periods/', {'name': 'Period 2', 'start_time': '09:00', 'end_time': '10:00'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_period(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/periods/', {'name': 'Period 2', 'start_time': '09:00', 'end_time': '10:00'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
