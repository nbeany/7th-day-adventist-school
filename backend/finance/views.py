from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from core.permissions import IsAdminOrReadOnly
from core.mixins import ProtectedDestroyMixin
from core.csv_export import csv_response
from audit.models import AuditLog
from .models import FeeCategory, Invoice, InvoiceItem, Payment
from .serializers import FeeCategorySerializer, InvoiceSerializer, PaymentSerializer
from sis.models import StudentProfile
from academics.models import Term
import datetime

class FeeCategoryViewSet(ProtectedDestroyMixin, viewsets.ModelViewSet):
    queryset = FeeCategory.objects.all()
    serializer_class = FeeCategorySerializer
    permission_classes = [IsAdminOrReadOnly]

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().select_related('student__user', 'term').prefetch_related('items', 'payments')
    serializer_class = InvoiceSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
            
        if user.role == 'PARENT':
            from sis.models import StudentGuardianRelation, GuardianProfile
            try:
                guardian = GuardianProfile.objects.get(user=user)
                child_ids = StudentGuardianRelation.objects.filter(guardian=guardian).values_list('student_id', flat=True)
                queryset = queryset.filter(student_id__in=child_ids)
            except GuardianProfile.DoesNotExist:
                return queryset.none()
        elif user.role != 'ADMIN':
            return queryset.none()

        student = self.request.query_params.get('student')
        if student:
            queryset = queryset.filter(student_id=student)
        return queryset

    @action(detail=False, methods=['get'])
    def export(self, request):
        queryset = self.get_queryset()
        rows = (
            [
                f"{inv.student.user.first_name} {inv.student.user.last_name}",
                inv.term.name,
                inv.status,
                inv.total_amount,
                inv.amount_paid,
                inv.total_amount - inv.amount_paid,
                inv.due_date,
            ]
            for inv in queryset
        )
        return csv_response(
            'invoices_export.csv',
            ['Student', 'Term', 'Status', 'Total', 'Paid', 'Balance', 'Due Date'],
            rows
        )

    @action(detail=False, methods=['post'])
    def generate_term_invoices(self, request):
        term_id = request.data.get('term_id')
        due_date_str = request.data.get('due_date')

        if not term_id or not due_date_str:
            return Response({"error": "term_id and due_date are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            due_date = datetime.datetime.strptime(due_date_str, '%Y-%m-%d').date()
            term = Term.objects.get(pk=term_id)
        except (ValueError, Term.DoesNotExist):
            return Response({"error": "Invalid term_id or due_date format (YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)

        fees = FeeCategory.objects.all()
        if not fees.exists():
            return Response({"error": "No fee categories exist to bill."}, status=status.HTTP_400_BAD_REQUEST)

        # Get all students with active enrollments for this term
        from sis.models import StudentEnrollment
        active_enrollments = StudentEnrollment.objects.filter(term=term, status='ACTIVE')
        student_ids = active_enrollments.values_list('student_id', flat=True).distinct()

        created_count = 0
        with transaction.atomic():
            for sid in student_ids:
                invoice, created = Invoice.objects.get_or_create(
                    student_id=sid,
                    term=term,
                    defaults={'due_date': due_date}
                )
                
                if created:
                    created_count += 1
                    # Add all default fees
                    for fee in fees:
                        if fee.default_amount > 0:
                            InvoiceItem.objects.create(
                                invoice=invoice,
                                fee_category=fee,
                                amount=fee.default_amount
                            )
                    # Trigger balance update to set total_amount
                    invoice.update_balance()

        return Response({"message": f"Generated {created_count} new invoices for term {term.name}."})

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().select_related('invoice__student__user').order_by('-payment_date', '-id')
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminOrReadOnly]

    def perform_create(self, serializer):
        payment = serializer.save()
        AuditLog.objects.log(
            self.request.user, 'payment.create', object_repr=str(payment),
            invoice_id=payment.invoice_id, amount=str(payment.amount), method=payment.payment_method
        )

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
            
        if user.role == 'PARENT':
            from sis.models import StudentGuardianRelation, GuardianProfile
            try:
                guardian = GuardianProfile.objects.get(user=user)
                child_ids = StudentGuardianRelation.objects.filter(guardian=guardian).values_list('student_id', flat=True)
                queryset = queryset.filter(invoice__student_id__in=child_ids)
            except GuardianProfile.DoesNotExist:
                return queryset.none()
        elif user.role != 'ADMIN':
            return queryset.none()
            
        invoice = self.request.query_params.get('invoice')
        if invoice:
            queryset = queryset.filter(invoice_id=invoice)
        return queryset
