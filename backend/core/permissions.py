from rest_framework.permissions import BasePermission, SAFE_METHODS


def user_role(user):
    return getattr(user, 'role', None)


def is_admin(user):
    return bool(user and user.is_authenticated and (user.is_staff or user_role(user) == 'ADMIN'))


class IsAdmin(BasePermission):
    """Only admins (staff or role=ADMIN) may access this view at all."""

    def has_permission(self, request, view):
        return is_admin(request.user)


class IsAdminOrReadOnly(BasePermission):
    """Any authenticated user may read; only admins may write."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return is_admin(user)


class IsAdminOrTeacherReadOnly(BasePermission):
    """Any authenticated user may read; only admins/teachers may write."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return is_admin(user) or user_role(user) == 'TEACHER'


def teacher_has_section_access(user, section_id, subject_id=None):
    """
    Whether a TEACHER is the homeroom teacher of `section_id`, or is
    scheduled (via SubjectTeacher) to teach `subject_id` in it.
    Admins always pass; any other role fails.
    """
    if is_admin(user):
        return True
    if user_role(user) != 'TEACHER':
        return False

    from academics.models import Section, SubjectTeacher

    if Section.objects.filter(id=section_id, homeroom_teacher=user).exists():
        return True

    qs = SubjectTeacher.objects.filter(teacher=user, section_id=section_id)
    if subject_id:
        qs = qs.filter(subject_id=subject_id)
    return qs.exists()
