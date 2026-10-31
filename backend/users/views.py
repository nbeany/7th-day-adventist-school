import csv
import io
import secrets
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from django.db.models import Q
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from core.permissions import IsAdmin
from audit.models import AuditLog
from .models import User
from .serializers import UserSerializer, CreateUserSerializer


class BulkUploadThrottle(UserRateThrottle):
    scope = 'bulk_upload'


class PasswordChangeThrottle(UserRateThrottle):
    scope = 'password_change'


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_permissions(self):
        # Any authenticated user may change their own password; everything
        # else here (listing/creating/editing accounts, bulk upload) is
        # restricted to admins since it exposes every account's PII and
        # allows setting arbitrary roles.
        if self.action == 'change_password':
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        qs = User.objects.all().order_by('username')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(username__icontains=search) | Q(first_name__icontains=search) |
                Q(last_name__icontains=search) | Q(email__icontains=search)
            )
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateUserSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        self._ensure_profile_exists(user)

    def perform_update(self, serializer):
        old_role = serializer.instance.role
        user = serializer.save()
        if user.role != old_role:
            AuditLog.objects.log(
                self.request.user, 'user.role_change', object_repr=str(user),
                target_user_id=user.id, old_role=old_role, new_role=user.role
            )

    def perform_destroy(self, instance):
        AuditLog.objects.log(
            self.request.user, 'user.delete', object_repr=str(instance),
            target_user_id=instance.id, target_username=instance.username, target_role=instance.role
        )
        instance.delete()

    def _ensure_profile_exists(self, user):
        from sis.models import StudentProfile, GuardianProfile
        if user.role == 'STUDENT':
            StudentProfile.objects.get_or_create(user=user)
        elif user.role == 'PARENT':
            GuardianProfile.objects.get_or_create(user=user)

    @action(detail=False, methods=['post'], throttle_classes=[BulkUploadThrottle])
    def bulk_upload(self, request):
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return Response({"error": "File must be a CSV."}, status=status.HTTP_400_BAD_REQUEST)

        MAX_UPLOAD_BYTES = 2 * 1024 * 1024
        if file.size > MAX_UPLOAD_BYTES:
            return Response({"error": "File is too large (max 2MB)."}, status=status.HTTP_400_BAD_REQUEST)

        decoded_file = file.read().decode('utf-8')
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)

        created = []
        errors = []

        for row_index, row in enumerate(reader, start=1):
            username = row.get('username')
            email = row.get('email')
            first_name = row.get('first_name', '')
            last_name = row.get('last_name', '')
            role = row.get('role', 'STUDENT').upper()
            phone_number = row.get('phone_number', '')

            if not username or not email:
                errors.append(f"Row {row_index}: Missing username or email.")
                continue

            if User.objects.filter(username=username).exists():
                errors.append(f"Row {row_index}: Username {username} already exists.")
                continue

            try:
                # Random per-user password, not a guessable "username123!"
                # pattern. The user must change it on first login.
                temp_password = secrets.token_urlsafe(9)
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role=role,
                    phone_number=phone_number,
                    password=make_password(temp_password),
                    must_change_password=True,
                )
                self._ensure_profile_exists(user)
                created.append({"username": username, "temporary_password": temp_password})
            except Exception as e:
                errors.append(f"Row {row_index}: Error creating user - {str(e)}")

        if created:
            AuditLog.objects.log(
                request.user, 'user.bulk_create', object_repr=f"{len(created)} users",
                usernames=[c['username'] for c in created], error_count=len(errors)
            )

        return Response({
            "message": f"Successfully created {len(created)} users.",
            "created": created,
            "errors": errors
        }, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)

    @action(detail=False, methods=['post'], throttle_classes=[PasswordChangeThrottle])
    def change_password(self, request):
        user = request.user

        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({"error": "Both old_password and new_password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({"error": "Incorrect old password."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            return Response({"error": " ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.must_change_password = False
        user.save()
        return Response({"message": "Password updated successfully."})

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Admin-only: issue a new random temporary password for an account
        that's locked out, forgotten theirs, etc. There's no email delivery
        in this system, so the generated password is returned directly to
        the admin to hand off, and the account is forced to change it on
        next login."""
        user = self.get_object()
        temp_password = secrets.token_urlsafe(9)
        user.set_password(temp_password)
        user.must_change_password = True
        user.save()
        AuditLog.objects.log(
            request.user, 'user.password_reset', object_repr=str(user), target_user_id=user.id
        )
        return Response({"temporary_password": temp_password})
