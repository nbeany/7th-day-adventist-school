from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from academics.models import Term, GradeLevel, Section
from sis.models import StudentProfile
from .models import AttendanceRecord

User = get_user_model()


def make_user(username, role, password='pass1234!'):
    return User.objects.create_user(username=username, password=password, role=role, email=f'{username}@example.com')


class AttendanceAuthorizationTests(APITestCase):
    def setUp(self):
        self.admin = make_user('admin', 'ADMIN')
        self.homeroom_teacher = make_user('homeroom', 'TEACHER')
        self.other_teacher = make_user('other_teacher', 'TEACHER')

        self.student_user = make_user('kid', 'STUDENT')
        self.student = StudentProfile.objects.create(user=self.student_user)
        self.other_student_user = make_user('otherkid', 'STUDENT')
        self.other_student = StudentProfile.objects.create(user=self.other_student_user)

        self.term = Term.objects.create(name='Term 1', start_date='2026-01-01', end_date='2026-06-01', is_active=True)
        grade_level = GradeLevel.objects.create(name='Grade 9', level_order=9)
        self.section = Section.objects.create(name='A', grade_level=grade_level, homeroom_teacher=self.homeroom_teacher)

        self.record = AttendanceRecord.objects.create(
            student=self.student, section=self.section, term=self.term, date='2026-02-01', status='PRESENT'
        )
        AttendanceRecord.objects.create(
            student=self.other_student, section=self.section, term=self.term, date='2026-02-01', status='ABSENT'
        )

    def test_student_only_sees_own_attendance(self):
        self.client.force_authenticate(self.student_user)
        resp = self.client.get('/api/attendance/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in resp.data['results']]
        self.assertEqual(ids, [self.record.id])

    def test_student_cannot_mark_attendance(self):
        self.client.force_authenticate(self.student_user)
        resp = self.client.post('/api/attendance/bulk_update/', {
            'section_id': self.section.id, 'term_id': self.term.id, 'date': '2026-02-02',
            'records': [{'student_id': self.student.id, 'status': 'PRESENT'}]
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_not_assigned_to_section_cannot_mark_attendance(self):
        self.client.force_authenticate(self.other_teacher)
        resp = self.client.post('/api/attendance/bulk_update/', {
            'section_id': self.section.id, 'term_id': self.term.id, 'date': '2026-02-02',
            'records': [{'student_id': self.student.id, 'status': 'PRESENT'}]
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_homeroom_teacher_can_mark_attendance_for_own_section(self):
        self.client.force_authenticate(self.homeroom_teacher)
        resp = self.client.post('/api/attendance/bulk_update/', {
            'section_id': self.section.id, 'term_id': self.term.id, 'date': '2026-02-02',
            'records': [{'student_id': self.student.id, 'status': 'LATE'}]
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        updated = AttendanceRecord.objects.get(student=self.student, date='2026-02-02')
        self.assertEqual(updated.status, 'LATE')

    def test_admin_can_mark_attendance_for_any_section(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/attendance/bulk_update/', {
            'section_id': self.section.id, 'term_id': self.term.id, 'date': '2026-02-03',
            'records': [{'student_id': self.student.id, 'status': 'EXCUSED'}]
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_export_returns_csv_scoped_to_role(self):
        """The student's record is PRESENT, the other student's is ABSENT -
        a student's export must contain their own row but not the other
        student's."""
        self.client.force_authenticate(self.student_user)
        resp = self.client.get('/api/attendance/export/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp['Content-Type'], 'text/csv')
        body = resp.content.decode()
        self.assertIn('Date,Student,Section,Status,Notes', body)
        self.assertIn('PRESENT', body)
        self.assertNotIn('ABSENT', body)

    def test_admin_export_includes_all_students(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/attendance/export/')
        body = resp.content.decode()
        self.assertIn('PRESENT', body)
        self.assertIn('ABSENT', body)
