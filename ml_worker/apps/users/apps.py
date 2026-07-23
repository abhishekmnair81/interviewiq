"""
ML Worker — Users app stub
============================
The ml_worker needs the users app only for the custom User model
(AUTH_USER_MODEL = 'users.User'). No views or URLs are needed here.
"""
from django.apps import AppConfig

class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.users'
