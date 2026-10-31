from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import SchoolConfig, Announcement

User = get_user_model()


def make_user(username, role, password='pass1234!'):
    return User.objects.create_user(username=username, password=password, role=role, email=f'{username}@example.com')


class SchoolConfigPermissionTests(APITestCase):
    def setUp(self):
        self.admin = make_user('admin', 'ADMIN')
        self.student = make_user('student', 'STUDENT')
        self.config = SchoolConfig.objects.create(name='Test School')

    def test_non_admin_cannot_update_school_config(self):
        self.client.force_authenticate(self.student)
        resp = self.client.patch(f'/api/schools/{self.config.id}/', {'name': 'Hacked School'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_school_config(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(f'/api/schools/{self.config.id}/', {'name': 'Renamed School'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class AnnouncementPermissionTests(APITestCase):
    def setUp(self):
        self.admin = make_user('admin', 'ADMIN')
        self.student = make_user('student', 'STUDENT')

    def test_anonymous_can_read_announcements(self):
        Announcement.objects.create(title='Hi', content='Body', created_by=self.admin)
        resp = self.client.get('/api/announcements/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_non_admin_cannot_post_announcement(self):
        self.client.force_authenticate(self.student)
        resp = self.client.post('/api/announcements/', {'title': 'Spam', 'content': 'Body'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_post_announcement(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/announcements/', {'title': 'News', 'content': 'Body'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
