from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Term, GradeLevel

User = get_user_model()


def make_user(username, role, password='pass1234!'):
    return User.objects.create_user(username=username, password=password, role=role, email=f'{username}@example.com')


class AcademicsPermissionTests(APITestCase):
    def setUp(self):
        self.admin = make_user('admin', 'ADMIN')
        self.teacher = make_user('teacher', 'TEACHER')

    def test_any_authenticated_user_can_read_terms(self):
        Term.objects.create(name='Term 1', start_date='2026-01-01', end_date='2026-06-01', is_active=True)
        self.client.force_authenticate(self.teacher)
        resp = self.client.get('/api/terms/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_non_admin_cannot_create_term(self):
        self.client.force_authenticate(self.teacher)
        resp = self.client.post('/api/terms/', {
            'name': 'Term 2', 'start_date': '2026-06-02', 'end_date': '2026-12-01', 'is_active': False
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_grade_level(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/grade-levels/', {'name': 'Grade 10', 'level_order': 10})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(GradeLevel.objects.count(), 1)
