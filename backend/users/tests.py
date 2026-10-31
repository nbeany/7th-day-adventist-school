import io
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


def make_user(username, role, password='pass1234!'):
    return User.objects.create_user(username=username, password=password, role=role, email=f'{username}@example.com')


class UserViewSetPermissionTests(APITestCase):
    def setUp(self):
        self.admin = make_user('admin1', 'ADMIN')
        self.teacher = make_user('teacher1', 'TEACHER')
        self.student = make_user('student1', 'STUDENT')

    def test_anonymous_cannot_list_users(self):
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_cannot_list_users(self):
        self.client.force_authenticate(self.student)
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_cannot_create_users(self):
        self.client.force_authenticate(self.teacher)
        resp = self.client.post('/api/users/', {
            'username': 'newuser', 'password': 'x', 'first_name': 'A', 'last_name': 'B', 'role': 'STUDENT'
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_cannot_escalate_own_role(self):
        """A logged-in student must not be able to PATCH their own role to ADMIN."""
        self.client.force_authenticate(self.student)
        resp = self.client.patch(f'/api/users/{self.student.id}/', {'role': 'ADMIN'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, 'STUDENT')

    def test_admin_can_list_and_create_users(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        resp = self.client.post('/api/users/', {
            'username': 'newteacher', 'password': 'x', 'first_name': 'A', 'last_name': 'B', 'role': 'TEACHER'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_search_matches_across_pages_not_just_current_page(self):
        """Regression check: search must run server-side against the whole
        table, not just whatever page the client currently has loaded."""
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/users/?search=teacher1')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        usernames = [u['username'] for u in resp.data['results']]
        self.assertEqual(usernames, ['teacher1'])

    def test_any_authenticated_user_can_change_own_password(self):
        self.client.force_authenticate(self.student)
        resp = self.client.post('/api/users/change_password/', {
            'old_password': 'pass1234!', 'new_password': 'newSecurePass9!'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertTrue(self.student.check_password('newSecurePass9!'))

    def test_change_password_rejects_weak_password(self):
        self.client.force_authenticate(self.student)
        resp = self.client.post('/api/users/change_password/', {
            'old_password': 'pass1234!', 'new_password': '12345'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_reset_another_users_password(self):
        self.client.force_authenticate(self.admin)
        old_hash = self.teacher.password
        resp = self.client.post(f'/api/users/{self.teacher.id}/reset_password/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        temp_password = resp.data['temporary_password']

        self.teacher.refresh_from_db()
        self.assertNotEqual(self.teacher.password, old_hash)
        self.assertTrue(self.teacher.check_password(temp_password))
        self.assertTrue(self.teacher.must_change_password)

    def test_non_admin_cannot_reset_password(self):
        self.client.force_authenticate(self.teacher)
        resp = self.client.post(f'/api/users/{self.student.id}/reset_password/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class BulkUploadTests(APITestCase):
    def setUp(self):
        self.admin = make_user('admin2', 'ADMIN')

    def test_non_admin_cannot_bulk_upload(self):
        student = make_user('student2', 'STUDENT')
        self.client.force_authenticate(student)
        csv_content = b"username,email,first_name,last_name,role\nu1,u1@example.com,U,One,STUDENT\n"
        upload = io.BytesIO(csv_content)
        upload.name = 'users.csv'
        resp = self.client.post('/api/users/bulk_upload/', {'file': upload}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_bulk_upload_generates_random_password_and_forces_change(self):
        self.client.force_authenticate(self.admin)
        csv_content = b"username,email,first_name,last_name,role\nbulkuser,bulkuser@example.com,Bulk,User,STUDENT\n"
        upload = io.BytesIO(csv_content)
        upload.name = 'users.csv'
        resp = self.client.post('/api/users/bulk_upload/', {'file': upload}, format='multipart')
        self.assertIn(resp.status_code, (status.HTTP_200_OK, status.HTTP_207_MULTI_STATUS))

        created_user = User.objects.get(username='bulkuser')
        self.assertTrue(created_user.must_change_password)

        temp_password = resp.data['created'][0]['temporary_password']
        self.assertNotEqual(temp_password, 'bulkuser123!')
        self.assertGreaterEqual(len(temp_password), 8)
        self.assertTrue(created_user.check_password(temp_password))
