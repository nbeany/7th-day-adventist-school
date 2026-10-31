from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = ['id', 'actor', 'actor_username', 'action', 'object_repr', 'details', 'created_at']
        read_only_fields = fields
