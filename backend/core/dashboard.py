from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.cache import cache
from django.utils import timezone
from django.db.models import Sum
from users.models import User
from sis.models import StudentProfile, StudentEnrollment
from attendance.models import AttendanceRecord
from finance.models import Invoice

class DashboardStatsView(APIView):
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
                'last_updated': timezone.now().isoformat()
            }
            
            # Cache for 15 minutes
            cache.set(cache_key, stats, 60 * 15)

        return Response(stats)
