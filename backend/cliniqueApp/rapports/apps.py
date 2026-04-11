from django.apps import AppConfig


class RapportsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name               = 'cliniqueApp.rapports'
    label              = 'rapports'

    def ready(self):
        try:
            from cliniqueApp.rapports.signals import connect_signals
            connect_signals()
            print('[RAPPORTS] Signals connectés.')
        except Exception as e:
            print(f'[RAPPORTS] Erreur : {e}')