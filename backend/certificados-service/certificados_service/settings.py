from pathlib import Path
import os

# Configurar PyMySQL como driver MySQL
import pymysql
pymysql.install_as_MySQLdb()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-certificados-service-key-change-in-production'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# ALLOWED_HOSTS - configuração COMPLETA para Docker (PENTE FINO)
ALLOWED_HOSTS_BASE = [
    'localhost', '127.0.0.1', '0.0.0.0',
    '177.44.248.89',  # IP do servidor
    'eventos_certificados', 'certificados-service',  # Nomes dos containers
    'eventos_certificados:8000', 'certificados-service:8000',  # Com porta
    'eventos-certificados-service', 'eventos-certificados-service:8000',  # Variações
    'certificados', 'certificados:8000',  # Nomes curtos
    'django', 'django:8000'  # Fallbacks genéricos
]

# Adicionar hosts do ambiente
ALLOWED_HOSTS_ENV = os.getenv('ALLOWED_HOSTS', '')
if ALLOWED_HOSTS_ENV:
    ALLOWED_HOSTS_BASE.extend([host.strip() for host in ALLOWED_HOSTS_ENV.split(',') if host.strip()])

# Em desenvolvimento/produção com Docker, aceitar QUALQUER host
if DEBUG:
    ALLOWED_HOSTS = ['*']  # Aceita TUDO em desenvolvimento
else:
    ALLOWED_HOSTS = list(set(ALLOWED_HOSTS_BASE))  # Remove duplicatas

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
]

LOCAL_APPS = [
    'apps.certificados',
    'apps.core',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'apps.certificados.middleware.LogTodosRequestsMiddleware',  # Log de requisições
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # 'django.middleware.csrf.CsrfViewMiddleware',  # DESABILITADO para APIs
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'certificados_service.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'certificados_service.wsgi.application'

# Database - MySQL (mesmo banco dos outros microserviços)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('DB_DATABASE', 'eventos'),
        'USER': os.getenv('DB_USERNAME', 'root'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', '127.0.0.1'),
        'PORT': os.getenv('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # Para desenvolvimento
    ],
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = True  # Permitir todas as origens para desenvolvimento
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://177.44.248.89:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://177.44.248.89:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://177.44.248.89:5174",
]

# Celery Configuration
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Email Configuration
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', 'seuemail@gmail.com')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', 'suasenha')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', f'Sistema de Eventos <{EMAIL_HOST_USER}>')

# URLs dos outros microserviços - Prioridade para containers Docker
MICROSERVICES_URLS = {
    'auth': {
        'primary': 'http://eventos_auth:8000',
        'fallback': 'http://177.44.248.89:8001'
    },
    'eventos': {
        'primary': 'http://eventos_eventos:8000', 
        'fallback': 'http://177.44.248.89:8002'
    },
    'inscricoes': {
        'primary': 'http://eventos_inscricoes:8000',
        'fallback': 'http://177.44.248.89:8003'
    },
    'presenca': {
        'primary': 'http://eventos_presenca:8000',
        'fallback': 'http://177.44.248.89:8004'
    }
}

# Configuração de logging detalhado
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {funcName} {lineno} {message}',
            'style': '{',
        },
        'console': {
            'format': '{levelname} {asctime} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file_detalhado': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'certificados.log',
            'formatter': 'verbose',
        },
        'console_detalhado': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'stream': 'ext://sys.stdout',
            'formatter': 'console',
        },
        'file_requests': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler', 
            'filename': BASE_DIR / 'logs' / 'requests.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console_detalhado', 'file_detalhado'],
        'level': 'DEBUG',
    },
    'loggers': {
        'django': {
            'handlers': ['console_detalhado', 'file_detalhado'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console_detalhado', 'file_requests'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'apps.certificados': {
            'handlers': ['console_detalhado', 'file_detalhado'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'apps.certificados.middleware': {
            'handlers': ['console_detalhado', 'file_requests'],
            'level': 'DEBUG', 
            'propagate': False,
        },
        'apps.certificados.views': {
            'handlers': ['console_detalhado', 'file_detalhado'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Criar diretório de logs se não existir
os.makedirs(BASE_DIR / 'logs', exist_ok=True)