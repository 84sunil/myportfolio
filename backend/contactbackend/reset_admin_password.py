import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contactbackend.settings')
import django

django.setup()
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.filter(username='admin').first()
if user is None:
    print('USER_NOT_FOUND')
    sys.exit(1)
user.set_password('Admin1234!')
user.save()
print('PASSWORD_RESET')
