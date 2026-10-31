import secrets
from users.models import User

temp_password = secrets.token_urlsafe(12)

if User.objects.filter(username='admin').exists():
    u = User.objects.get(username='admin')
    u.set_password(temp_password)
    u.is_superuser = True
    u.is_staff = True
    u.role = 'ADMIN'
    u.must_change_password = True
    u.save()
    print('RESET admin password')
else:
    u = User.objects.create_superuser(username='admin', email='admin@school.com', password=temp_password, role='ADMIN')
    u.must_change_password = True
    u.save()
    print('CREATED admin user')

print(f'Username: admin')
print(f'Temporary password: {temp_password}')
print('This password is shown once and not stored anywhere - save it now. You will be required to change it on first login.')
