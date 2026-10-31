from django.conf import settings
from django.db import models


class AuditLogManager(models.Manager):
    def log(self, actor, action, object_repr='', **details):
        """Records one audit entry. `actor` may be None for system-initiated
        actions; `details` is any small JSON-serializable context."""
        return self.create(actor=actor, action=action, object_repr=object_repr, details=details)


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=100)
    object_repr = models.CharField(max_length=255, blank=True)
    details = models.JSONField(blank=True, default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = AuditLogManager()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        who = self.actor.username if self.actor else 'system'
        return f"{who} · {self.action} · {self.object_repr}"
