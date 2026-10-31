from rest_framework import viewsets
from core.permissions import IsAdmin
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin-only, read-only feed of sensitive actions (role changes,
    deletions, password resets, payments, grade/attendance bulk writes,
    promotions). Nothing writes here except AuditLog.objects.log(...) calls
    made directly from the views that perform those actions."""
    queryset = AuditLog.objects.select_related('actor').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action__icontains=action)
        return qs
