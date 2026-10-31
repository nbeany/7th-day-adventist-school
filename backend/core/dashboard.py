from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.cache import cache
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from users.models import User
from sis.models import StudentProfile, StudentEnrollment
from attendance.models import AttendanceRecord
from finance.models import Invoice, Payment
from core.permissions import IsAdmin

class DashboardStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        cache_key = 'dashboard_stats'
        
        stats = cache.get(cache_key)
        
        if stats is None or force_refresh:
            # 1. User & Enrollment Stats
            total_students = StudentProfile.objects.count()
            total_teachers = User.objects.filter(role='TEACHER').count()
            active_enrollments = StudentEnrollment.objects.filter(status='ACTIVE').count()
            
            # 2. Today's Attendance
            today = timezone.now().date()
            today_records = AttendanceRecord.objects.filter(date=today)
            total_recorded = today_records.count()
            present_count = today_records.filter(status='PRESENT').count()
            
            attendance_rate = 0
            if total_recorded > 0:
                attendance_rate = round((present_count / total_recorded) * 100, 1)

            # 3. Financial Summary
            # Sum of total_amount across all invoices
            total_invoiced = Invoice.objects.aggregate(total=Sum('total_amount'))['total'] or 0
            total_paid = Invoice.objects.aggregate(total=Sum('amount_paid'))['total'] or 0
            outstanding_balance = total_invoiced - total_paid

            # 4. Attendance trend: present-rate per day for the last 14 days,
            # in one grouped query rather than one query per day.
            window_start = today - timedelta(days=13)
            daily_counts = (
                AttendanceRecord.objects.filter(date__gte=window_start, date__lte=today)
                .values('date')
                .annotate(total=Count('id'), present=Count('id', filter=Q(status='PRESENT')))
            )
            daily_by_date = {row['date']: row for row in daily_counts}
            attendance_trend = []
            for i in range(14):
                day = window_start + timedelta(days=i)
                row = daily_by_date.get(day)
                if row and row['total'] > 0:
                    rate = round((row['present'] / row['total']) * 100, 1)
                else:
                    rate = None
                attendance_trend.append({'date': day.isoformat(), 'rate': rate})

            # 5. Fee collection trend: total payments received per month,
            # for the last 6 months.
            month_start = (today.replace(day=1) - timedelta(days=150)).replace(day=1)
            monthly_payments = (
                Payment.objects.filter(payment_date__gte=month_start)
                .annotate(month=TruncMonth('payment_date'))
                .values('month')
                .annotate(total=Sum('amount'))
                .order_by('month')
            )
            payment_trend = [
                {'month': row['month'].strftime('%Y-%m'), 'total': float(row['total'])}
                for row in monthly_payments if row['month']
            ]

            stats = {
                'enrollment': {
                    'total_students': total_students,
                    'total_teachers': total_teachers,
                    'active_enrollments': active_enrollments,
                },
                'attendance': {
                    'today_rate': attendance_rate,
                    'total_recorded_today': total_recorded,
                    'present_today': present_count,
                },
                'finance': {
                    'total_invoiced': float(total_invoiced),
                    'total_paid': float(total_paid),
                    'outstanding_balance': float(outstanding_balance),
                },
                'attendance_trend': attendance_trend,
                'payment_trend': payment_trend,
                'last_updated': timezone.now().isoformat()
            }
            
            # Cache for 15 minutes
            cache.set(cache_key, stats, 60 * 15)

        return Response(stats)
