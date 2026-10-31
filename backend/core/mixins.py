from django.db.models.deletion import ProtectedError
from rest_framework import status
from rest_framework.response import Response


class ProtectedDestroyMixin:
    """
    Turns Django's ProtectedError (raised when deleting a row that's still
    referenced by an on_delete=PROTECT foreign key) into a clean 400
    response instead of an unhandled 500.
    """

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError as e:
            first = next(iter(e.protected_objects), None)
            referencing_model = first.__class__.__name__ if first is not None else 'other records'
            return Response(
                {"error": f"Can't delete this - it's still referenced by existing {referencing_model} records."},
                status=status.HTTP_400_BAD_REQUEST
            )
