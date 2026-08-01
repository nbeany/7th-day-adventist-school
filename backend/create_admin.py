from users.models import User
if User.objects.filter(username='admin').exists():
    u = User.objects.get(username='admin')
    u.set_password('admin123')
    u.is_superuser = True
    u.is_staff = True
    u.role = 'ADMIN'
    u.save()
    print('RESET admin password')
else:
    User.objects.create_superuser(username='admin', email='admin@school.com', password='admin123', role='ADMIN')
    print('CREATED admin user')
