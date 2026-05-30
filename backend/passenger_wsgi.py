import os
import sys

# Ajouter le chemin vers le projet Django (le dossier qui contient manage.py)
cwd = os.getcwd()
sys.path.insert(0, cwd)

# Pointer vers le module settings de Django
os.environ['DJANGO_SETTINGS_MODULE'] = 'clinique_projet.settings'

# Importer l'application WSGI de Django
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
