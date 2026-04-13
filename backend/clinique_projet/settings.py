from pathlib import Path
from decouple import Config, RepositoryEnv
from datetime import timedelta

import os

BASE_DIR = Path(__file__).resolve().parent.parent

_env_path = BASE_DIR / ".env"
if _env_path.is_file():
    _env_encoding = None
    for _enc in ("utf-8", "utf-8-sig", "cp1252"):
        try:
            _env_path.read_text(encoding=_enc)
            _env_encoding = _enc
            break
        except UnicodeDecodeError:
            continue
    if _env_encoding is None:
        _env_encoding = "utf-8"
    config = Config(RepositoryEnv(str(_env_path), encoding=_env_encoding))
else:
    from decouple import config

SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me')
DEBUG = config('DEBUG', cast=bool, default=True)
ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    cast=lambda v: [s.strip() for s in v.split(',') if s.strip()],
    default=''
)

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':  True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'AUTH_HEADER_TYPES': ('Bearer',),
}

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'cliniqueApp.users',
    'cliniqueApp.medicaments',
    'cliniqueApp.commandes',
    'cliniqueApp.stock',
    'cliniqueApp.alertes',
    'cliniqueApp.rapports',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'clinique_projet.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'clinique_projet.wsgi.application'

_db_password = config('CLINIQUE_DB_PASSWORD', default='').strip()
if not _db_password:
    _db_password = config('DB_PASSWORD', default='postgres')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME':     config('DB_NAME',  default='cliniquestock'),
        'USER':     config('DB_USER',  default='postgres'),
        'PASSWORD': _db_password,
        'HOST':     config('DB_HOST',  default='127.0.0.1'),
        'PORT':     config('DB_PORT',  default='5432'),
        'OPTIONS':  {'client_encoding': 'UTF8'},
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE     = 'Africa/Douala'
USE_I18N      = True
USE_TZ        = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]
CORS_ALLOW_CREDENTIALS = True

AUTH_USER_MODEL = 'users.Utilisateur'

# ── Email Gmail ───────────────────────────────────────────────────────────────
EMAIL_BACKEND       = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST          = 'smtp.gmail.com'
EMAIL_PORT          = 587
EMAIL_USE_TLS       = True
EMAIL_HOST_USER     = config('EMAIL_HOST_USER',     default='ngassamangela2@gmail.com')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='isjtztuxhwsgmmdy')
DEFAULT_FROM_EMAIL  = config('EMAIL_HOST_USER',     default='ngassamangela2@gmail.com')

# ── SMS / WhatsApp Infobip ────────────────────────────────────────────────────
INFOBIP_BASE_URL  = config('INFOBIP_BASE_URL',  default='3dd1kw.api.infobip.com')
INFOBIP_API_KEY   = config('INFOBIP_API_KEY',   default='207dd5d45c39080d383b5455436e7377-b1830e88-e762-41df-9b6a-28b7d4547924')
INFOBIP_SENDER_SMS        = config('INFOBIP_SENDER_SMS',        default='CliniqueStock')
INFOBIP_SENDER_WHATSAPP   = config('INFOBIP_SENDER_WHATSAPP',   default='676849422')   # ton numéro WA enregistré
INFOBIP_WA_TEMPLATE_NAME  = config('INFOBIP_WA_TEMPLATE_NAME',  default='test_whatsapp_template_name')
INFOBIP_WA_TEMPLATE_LANG  = config('INFOBIP_WA_TEMPLATE_LANG',  default='fr')


# Media files (uploads)
MEDIA_URL  = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')