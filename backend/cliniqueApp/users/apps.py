from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cliniqueApp.users'
    label = 'users'   # ← ce label est ce que Django utilise dans AUTH_USER_MODEL

