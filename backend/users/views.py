import csv
import io
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.hashers import make_password
from .models import User
from .serializers import UserSerializer, CreateUserSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateUserSerializer
        return UserSerializer

    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return Response({"error": "File must be a CSV."}, status=status.HTTP_400_BAD_REQUEST)

        decoded_file = file.read().decode('utf-8')
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)

        success_count = 0
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
                User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role=role,
                    phone_number=phone_number,
                    password=make_password(f"{username}123!") # Default password
                )
                success_count += 1
            except Exception as e:
                errors.append(f"Row {row_index}: Error creating user - {str(e)}")

        return Response({
            "message": f"Successfully created {success_count} users.",
            "errors": errors
        }, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)
