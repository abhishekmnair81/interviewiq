from django.apps import AppConfig


class SessionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.sessions'
    label = 'interview_sessions'
    verbose_name = 'Interview Sessions'

    def ready(self):
        import apps.sessions.signals
