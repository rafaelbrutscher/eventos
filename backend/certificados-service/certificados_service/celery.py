import os
from celery import Celery

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'certificados_service.settings')

# Criar instância do Celery
app = Celery('certificados_service')

# Configuração do Celery
app.config_from_object('django.conf:settings', namespace='CELERY')

# Configurações específicas
app.conf.update(
    broker_url='redis://localhost:6379/0',
    result_backend='redis://localhost:6379/0',
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='America/Sao_Paulo',
    enable_utc=True,
)

# Auto-descobrir tarefas
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')