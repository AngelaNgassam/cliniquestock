from django.apps import AppConfig


class RapportsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name               = 'cliniqueApp.rapports'
    label              = 'rapports'

    def ready(self):
        import cliniqueApp.rapports.signals  # noqa