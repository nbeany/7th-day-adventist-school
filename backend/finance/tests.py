from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from academics.models import Term, GradeLevel
from sis.models import StudentProfile, GuardianProfile, StudentGuardianRelation
from .models import FeeCategory, Invoice, InvoiceItem, Payment

User = get_user_model()


def make_user(username, role, password='pass1234!'):
    return User.objects.create_user(username=username, password=password, role=role, email=f'{username}@example.com')


class InvoiceBalanceTests(APITestCase):
    """
    Invoice.update_balance() had zero coverage despite driving every
    UNPAID/PARTIAL/PAID status transition shown across the finance UI.
    """

    def setUp(self):
        self.term = Term.objects.create(name='Term 1', start_date='2026-01-01', end_date='2026-06-01', is_active=True)
        student_user = make_user('kid', 'STUDENT')
        self.student = StudentProfile.objects.create(user=student_user)
        self.invoice = Invoice.objects.create(student=self.student, term=self.term, due_date='2026-03-01')
        self.fee = FeeCategory.objects.create(name='Tuition', default_amount=1000)

    def test_unpaid_when_no_payments(self):
        InvoiceItem.objects.create(invoice=self.invoice, fee_category=self.fee, amount=1000)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'UNPAID')
        self.assertEqual(self.invoice.total_amount, 1000)

    def test_partial_when_some_paid(self):
        InvoiceItem.objects.create(invoice=self.invoice, fee_category=self.fee, amount=1000)
        Payment.objects.create(invoice=self.invoice, amount=400, payment_method='CASH')
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'PARTIAL')
        self.assertEqual(self.invoice.amount_paid, 400)

    def test_paid_when_fully_paid(self):
        InvoiceItem.objects.create(invoice=self.invoice, fee_category=self.fee, amount=1000)
        Payment.objects.create(invoice=self.invoice, amount=1000, payment_method='CASH')
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'PAID')

    def test_paid_when_overpaid(self):
        InvoiceItem.objects.create(invoice=self.invoice, fee_category=self.fee, amount=1000)
        Payment.objects.create(invoice=self.invoice, amount=1200, payment_method='CASH')
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'PAID')
        self.assertEqual(self.invoice.amount_paid, 1200)

    def test_deleting_fee_category_in_use_returns_clean_error(self):
        """FeeCategory->InvoiceItem is on_delete=PROTECT; without ProtectedDestroyMixin
        this would 500 instead of a clean 400."""
        InvoiceItem.objects.create(invoice=self.invoice, fee_category=self.fee, amount=1000)
        admin = make_user('feeadmin', 'ADMIN')
        self.client.force_authenticate(admin)
        resp = self.client.delete(f'/api/fee-categories/{self.fee.id}/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(FeeCategory.objects.filter(id=self.fee.id).exists())


class FinanceAuthorizationTests(APITestCase):
    def setUp(self):
        self.admin = make_user('admin', 'ADMIN')
        self.term = Term.objects.create(name='Term 1', start_date='2026-01-01', end_date='2026-06-01', is_active=True)

        self.student_user = make_user('kid', 'STUDENT')
        self.student = StudentProfile.objects.create(user=self.student_user)

        self.guardian_user = make_user('parent', 'PARENT')
        self.guardian = GuardianProfile.objects.create(user=self.guardian_user)
        StudentGuardianRelation.objects.create(student=self.student, guardian=self.guardian)

        self.other_student_user = make_user('otherkid', 'STUDENT')
        self.other_student = StudentProfile.objects.create(user=self.other_student_user)

        self.invoice = Invoice.objects.create(student=self.student, term=self.term, due_date='2026-03-01')

    def test_parent_cannot_record_payment(self):
        """Only admins record payments; a parent must not be able to fabricate one."""
        self.client.force_authenticate(self.guardian_user)
        resp = self.client.post('/api/payments/', {
            'invoice': self.invoice.id, 'amount': 100, 'payment_method': 'CASH'
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_parent_cannot_see_other_students_invoice(self):
        other_invoice = Invoice.objects.create(student=self.other_student, term=self.term, due_date='2026-03-01')
        self.client.force_authenticate(self.guardian_user)
        resp = self.client.get('/api/invoices/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [inv['id'] for inv in resp.data['results']]
        self.assertIn(self.invoice.id, ids)
        self.assertNotIn(other_invoice.id, ids)

    def test_admin_can_record_payment(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/payments/', {
            'invoice': self.invoice.id, 'amount': 100, 'payment_method': 'CASH'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_invoice_export_scoped_to_parent(self):
        # Distinct due_date from self.invoice's so its presence/absence in
        # the CSV actually distinguishes the two rows.
        other_invoice = Invoice.objects.create(student=self.other_student, term=self.term, due_date='2026-04-15')
        self.client.force_authenticate(self.guardian_user)
        resp = self.client.get('/api/invoices/export/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp['Content-Type'], 'text/csv')
        body = resp.content.decode()
        self.assertIn('Student,Term,Status,Total,Paid,Balance,Due Date', body)
        self.assertIn(str(self.invoice.due_date), body)
        self.assertNotIn(str(other_invoice.due_date), body)
