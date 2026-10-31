from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from academics.models import Term
from sis.models import StudentProfile
from finance.models import Invoice
from .models import AuditLog

User = get_user_model()


def make_user(username, role, password='pass1234!'):
    return User.objects.create_user(username=username, password=password, role=role, email=f'{username}@example.com')


class AuditLoggingTests(APITestCase):
    """
    Nothing recorded who changed a grade, role, or payment before this -
    these pin down that the sensitive write paths actually log, and that
    the feed itself is admin-only.
    """

    def setUp(self):
        self.admin = make_user('audadmin', 'ADMIN')

    def test_role_change_is_logged(self):
        teacher = make_user('audteacher', 'TEACHER')
        self.client.force_authenticate(self.admin)
        self.client.patch(f'/api/users/{teacher.id}/', {'role': 'ADMIN'})

        entry = AuditLog.objects.get(action='user.role_change')
        self.assertEqual(entry.actor, self.admin)
        self.assertEqual(entry.details['old_role'], 'TEACHER')
        self.assertEqual(entry.details['new_role'], 'ADMIN')

    def test_user_delete_is_logged_before_the_row_is_gone(self):
        teacher = make_user('audteacher2', 'TEACHER')
        teacher_id = teacher.id
        self.client.force_authenticate(self.admin)
        self.client.delete(f'/api/users/{teacher_id}/')

        entry = AuditLog.objects.get(action='user.delete')
        self.assertEqual(entry.details['target_user_id'], teacher_id)

    def test_password_reset_is_logged(self):
        teacher = make_user('audteacher3', 'TEACHER')
        self.client.force_authenticate(self.admin)
        self.client.post(f'/api/users/{teacher.id}/reset_password/')

        self.assertTrue(AuditLog.objects.filter(action='user.password_reset', details__target_user_id=teacher.id).exists())

    def test_payment_creation_is_logged(self):
        student_user = make_user('audkid', 'STUDENT')
        student = StudentProfile.objects.create(user=student_user)
        term = Term.objects.create(name='Term 1', start_date='2026-01-01', end_date='2026-06-01', is_active=True)
        invoice = Invoice.objects.create(student=student, term=term, due_date='2026-03-01')

        self.client.force_authenticate(self.admin)
        self.client.post('/api/payments/', {'invoice': invoice.id, 'amount': 500, 'payment_method': 'CASH'})

        entry = AuditLog.objects.get(action='payment.create')
        self.assertEqual(entry.details['invoice_id'], invoice.id)

    def test_non_admin_cannot_view_audit_log(self):
        student = make_user('audstudent', 'STUDENT')
        self.client.force_authenticate(student)
        resp = self.client.get('/api/audit-logs/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_and_filter_audit_log(self):
        AuditLog.objects.log(self.admin, 'user.role_change', object_repr='someone')
        AuditLog.objects.log(self.admin, 'payment.create', object_repr='INV-1')

        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/audit-logs/?action=role_change')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        actions = [row['action'] for row in resp.data['results']]
        self.assertEqual(actions, ['user.role_change'])
