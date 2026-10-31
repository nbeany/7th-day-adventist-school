from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from academics.models import Term, GradeLevel, Section
from .models import StudentProfile, GuardianProfile, StudentGuardianRelation, StudentEnrollment

User = get_user_model()


def make_user(username, role, password='pass1234!'):
    return User.objects.create_user(username=username, password=password, role=role, email=f'{username}@example.com')


class SisAuthorizationTests(APITestCase):
    """
    Regression coverage for the previously-unfiltered GuardianProfile,
    StudentGuardianRelation, and StudentEnrollment endpoints: before this
    change, any authenticated user could read every guardian's PII and
    every student's enrollment record regardless of role.
    """

    def setUp(self):
        self.admin = make_user('admin', 'ADMIN')

        self.student_a_user = make_user('student_a', 'STUDENT')
        self.student_a = StudentProfile.objects.create(user=self.student_a_user)
        self.student_b_user = make_user('student_b', 'STUDENT')
        self.student_b = StudentProfile.objects.create(user=self.student_b_user)

        self.guardian_a_user = make_user('guardian_a', 'PARENT')
        self.guardian_a = GuardianProfile.objects.create(user=self.guardian_a_user)
        self.guardian_b_user = make_user('guardian_b', 'PARENT')
        self.guardian_b = GuardianProfile.objects.create(user=self.guardian_b_user)

        self.relation_a = StudentGuardianRelation.objects.create(student=self.student_a, guardian=self.guardian_a)
        self.relation_b = StudentGuardianRelation.objects.create(student=self.student_b, guardian=self.guardian_b)

        term = Term.objects.create(name='Term 1', start_date='2026-01-01', end_date='2026-06-01', is_active=True)
        grade_level = GradeLevel.objects.create(name='Grade 9', level_order=9)
        section = Section.objects.create(name='A', grade_level=grade_level)
        self.enrollment_a = StudentEnrollment.objects.create(student=self.student_a, section=section, term=term)
        self.enrollment_b = StudentEnrollment.objects.create(student=self.student_b, section=section, term=term)

    def test_parent_only_sees_own_guardian_record(self):
        self.client.force_authenticate(self.guardian_a_user)
        resp = self.client.get('/api/guardians/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [g['id'] for g in resp.data['results']]
        self.assertEqual(ids, [self.guardian_a.id])

    def test_parent_cannot_write_guardian_profiles(self):
        self.client.force_authenticate(self.guardian_a_user)
        resp = self.client.patch(f'/api/guardians/{self.guardian_b.id}/', {'occupation': 'hacked'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_only_sees_own_guardian_relations(self):
        self.client.force_authenticate(self.student_a_user)
        resp = self.client.get('/api/student-guardian-relations/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in resp.data['results']]
        self.assertEqual(ids, [self.relation_a.id])

    def test_parent_only_sees_own_childs_enrollment(self):
        self.client.force_authenticate(self.guardian_a_user)
        resp = self.client.get('/api/student-enrollments/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [e['id'] for e in resp.data['results']]
        self.assertEqual(ids, [self.enrollment_a.id])

    def test_admin_sees_all_enrollments(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/student-enrollments/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 2)

    def test_student_search_matches_username(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/students/?search=student_a')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual([s['id'] for s in resp.data['results']], [self.student_a.id])

    def test_guardian_search_matches_username(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/guardians/?search=guardian_b')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual([g['id'] for g in resp.data['results']], [self.guardian_b.id])

    def test_student_cannot_create_enrollment(self):
        self.client.force_authenticate(self.student_a_user)
        resp = self.client.post('/api/student-enrollments/', {
            'student': self.student_a.id, 'section': 1, 'term': 1
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class PromotionTests(APITestCase):
    def setUp(self):
        self.admin = make_user('promoadmin', 'ADMIN')
        self.student_user = make_user('promostudent', 'STUDENT')
        self.student = StudentProfile.objects.create(user=self.student_user)

        self.term1 = Term.objects.create(name='2025-2026', start_date='2025-09-01', end_date='2026-06-01', is_active=False)
        self.term2 = Term.objects.create(name='2026-2027', start_date='2026-09-01', end_date='2027-06-01', is_active=True)
        grade5 = GradeLevel.objects.create(name='Grade 5', level_order=5)
        grade6 = GradeLevel.objects.create(name='Grade 6', level_order=6)
        self.section_5a = Section.objects.create(name='Grade 5A', grade_level=grade5)
        self.section_6a = Section.objects.create(name='Grade 6A', grade_level=grade6)

        self.enrollment = StudentEnrollment.objects.create(
            student=self.student, section=self.section_5a, term=self.term1, status='ACTIVE'
        )

    def test_promote_moves_student_and_completes_old_enrollment(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/student-enrollments/promote/', {
            'from_section_id': self.section_5a.id,
            'to_section_id': self.section_6a.id,
            'to_term_id': self.term2.id,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['promoted_student_ids'], [self.student.id])

        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.status, 'COMPLETED')

        new_enrollment = StudentEnrollment.objects.get(student=self.student, term=self.term2)
        self.assertEqual(new_enrollment.section_id, self.section_6a.id)
        self.assertEqual(new_enrollment.status, 'ACTIVE')

    def test_non_admin_cannot_promote(self):
        self.client.force_authenticate(self.student_user)
        resp = self.client.post('/api/student-enrollments/promote/', {
            'from_section_id': self.section_5a.id,
            'to_section_id': self.section_6a.id,
            'to_term_id': self.term2.id,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
