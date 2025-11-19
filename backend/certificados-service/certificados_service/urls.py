from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def health_check(request):
    """Health check mais detalhado para debug"""
    from django.db import connection
    from django.utils import timezone
    
    try:
        # Testar conexão com banco
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_status = 'healthy'
    except Exception as e:
        db_status = f'error: {str(e)}'
    
    return JsonResponse({
        'status': 'healthy',
        'service': 'certificados-service',
        'timestamp': timezone.now().isoformat(),
        'database': db_status,
        'allowed_hosts': settings.ALLOWED_HOSTS,
        'debug': settings.DEBUG
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('', include('apps.certificados.urls')),
]

# Servir arquivos de media em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)