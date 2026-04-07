from django.apps import AppConfig


class AlertesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name               = 'cliniqueApp.alertes'
    label              = 'alertes'

    def ready(self):
        import cliniqueApp.alertes.signals  # noqa — active les signals