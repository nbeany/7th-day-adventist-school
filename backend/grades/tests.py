from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from academics.models import Term, GradeLevel, Section, Subject, SubjectTeacher
from sis.models import StudentProfile
from .models import Assignment, Grade, TermGrade

User = get_user_model()


def make_user(username, role, password='pass1234!'):
    return User.objects.create_user(username=username, password=password, role=role, email=f'{username}@example.com')


class GradeComputeTests(APITestCase):
    """
    grades/views.py:compute() had zero test coverage despite computing every
    student's term grade from a weighted average of assignment scores - this
    pins down the arithmetic and the letter-grade thresholds.
    """

    def setUp(self):
        self.teacher = make_user('teacher', 'TEACHER')
        self.other_teacher = make_user('other_teacher', 'TEACHER')
        self.student_user = make_user('kid', 'STUDENT')
        self.student = StudentProfile.objects.create(user=self.student_user)

        self.term = Term.objects.create(name='Term 1', start_date='2026-01-01', end_date='2026-06-01', is_active=True)
        grade_level = GradeLevel.objects.create(name='Grade 9', level_order=9)
        self.section = Section.objects.create(name='A', grade_level=grade_level)
        self.subject = Subject.objects.create(name='Math', code='MTH')
        SubjectTeacher.objects.create(teacher=self.teacher, subject=self.subject, section=self.section)

        self.a1 = Assignment.objects.create(
            name='Quiz', subject=self.subject, section=self.section, term=self.term, max_score=100, weight=0.4
        )
        self.a2 = Assignment.objects.create(
            name='Exam', subject=self.subject, section=self.section, term=self.term, max_score=50, weight=0.6
        )
        Grade.objects.create(student=self.student, assignment=self.a1, score=80)  # 80%
        Grade.objects.create(student=self.student, assignment=self.a2, score=45)  # 90%

    def test_compute_weighted_average_and_letter_grade(self):
        # weighted = 80*0.4 + 90*0.6 = 32 + 54 = 86 / (0.4+0.6) = 86.0 -> 'A'
        self.client.force_authenticate(self.teacher)
        resp = self.client.post('/api/term-grades/compute/', {
            'section_id': self.section.id, 'subject_id': self.subject.id, 'term_id': self.term.id
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        term_grade = TermGrade.objects.get(student=self.student, subject=self.subject, term=self.term)
        self.assertEqual(float(term_grade.final_score), 86.0)
        self.assertEqual(term_grade.letter_grade, 'A')

    def test_teacher_not_assigned_to_subject_cannot_compute(self):
        self.client.force_authenticate(self.other_teacher)
        resp = self.client.post('/api/term-grades/compute/', {
            'section_id': self.section.id, 'subject_id': self.subject.id, 'term_id': self.term.id
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_call_compute(self):
        self.client.force_authenticate(self.student_user)
        resp = self.client.post('/api/term-grades/compute/', {
            'section_id': self.section.id, 'subject_id': self.subject.id, 'term_id': self.term.id
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class GradeAccessTests(APITestCase):
    def setUp(self):
        self.student_user = make_user('kid', 'STUDENT')
        self.student = StudentProfile.objects.create(user=self.student_user)
        self.other_student_user = make_user('otherkid', 'STUDENT')
        self.other_student = StudentProfile.objects.create(user=self.other_student_user)

        self.term = Term.objects.create(name='Term 1', start_date='2026-01-01', end_date='2026-06-01', is_active=True)
        grade_level = GradeLevel.objects.create(name='Grade 9', level_order=9)
        section = Section.objects.create(name='A', grade_level=grade_level)
        subject = Subject.objects.create(name='Math', code='MTH')

        TermGrade.objects.create(student=self.student, subject=subject, section=section, term=self.term, final_score=90, letter_grade='A')
        TermGrade.objects.create(student=self.other_student, subject=subject, section=section, term=self.term, final_score=70, letter_grade='B')

    def test_student_cannot_view_another_students_summary(self):
        self.client.force_authenticate(self.student_user)
        resp = self.client.get(f'/api/term-grades/summary/?student_id={self.other_student.id}&term_id={self.term.id}')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_can_view_own_summary(self):
        self.client.force_authenticate(self.student_user)
        resp = self.client.get(f'/api/term-grades/summary/?student_id={self.student.id}&term_id={self.term.id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['overall_average'], 90.0)

    def test_export_scoped_to_student_role(self):
        self.client.force_authenticate(self.student_user)
        resp = self.client.get('/api/term-grades/export/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp['Content-Type'], 'text/csv')
        body = resp.content.decode()
        self.assertIn('90', body)
        self.assertNotIn('70', body)


class ReportCardTests(APITestCase):
    def setUp(self):
        self.admin = make_user('rcadmin', 'ADMIN')
        self.teacher = make_user('rcteacher', 'TEACHER')
        self.other_teacher = make_user('rcotherteacher', 'TEACHER')

        self.student_user = make_user('rckid', 'STUDENT')
        self.student = StudentProfile.objects.create(user=self.student_user)
        self.other_student_user = make_user('rcotherkid', 'STUDENT')
        self.other_student = StudentProfile.objects.create(user=self.other_student_user)

        self.term = Term.objects.create(name='Term 1', start_date='2026-01-01', end_date='2026-06-01', is_active=True)
        grade_level = GradeLevel.objects.create(name='Grade 9', level_order=9)
        self.section = Section.objects.create(name='A', grade_level=grade_level)
        subject = Subject.objects.create(name='Math', code='MTH')
        SubjectTeacher.objects.create(teacher=self.teacher, subject=subject, section=self.section)

        TermGrade.objects.create(student=self.student, subject=subject, section=self.section, term=self.term, final_score=90, letter_grade='A')
        TermGrade.objects.create(student=self.other_student, subject=subject, section=self.section, term=self.term, final_score=70, letter_grade='B')

    def test_single_report_card_is_a_pdf(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get(f'/api/term-grades/generate_report_card/?student_id={self.student.id}&term_id={self.term.id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp['Content-Type'], 'application/pdf')
        self.assertTrue(resp.content.startswith(b'%PDF'))

    def test_batch_report_cards_is_a_zip_with_one_entry_per_student(self):
        import zipfile
        import io

        self.client.force_authenticate(self.teacher)
        resp = self.client.get(f'/api/term-grades/generate_section_report_cards/?section_id={self.section.id}&term_id={self.term.id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp['Content-Type'], 'application/zip')

        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        self.assertEqual(len(zf.namelist()), 2)
        for name in zf.namelist():
            self.assertTrue(zf.read(name).startswith(b'%PDF'))

    def test_teacher_not_assigned_to_section_cannot_batch_generate(self):
        self.client.force_authenticate(self.other_teacher)
        resp = self.client.get(f'/api/term-grades/generate_section_report_cards/?section_id={self.section.id}&term_id={self.term.id}')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_batch_generate(self):
        self.client.force_authenticate(self.student_user)
        resp = self.client.get(f'/api/term-grades/generate_section_report_cards/?section_id={self.section.id}&term_id={self.term.id}')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
