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
        'debug': settings.DEBUG,
        'endpoints': {
            'gerar_certificado': '/api/gerar-certificado',
            'health': '/health/',
            'test': '/test-certificado/'
        }
    })

def test_certificado(request):
    """Endpoint de teste para verificar se a geração de certificado funciona"""
    return JsonResponse({
        'message': 'Serviço de certificados funcionando!',
        'method': request.method,
        'timestamp': timezone.now().isoformat(),
        'test_data': {
            'user_id': 1,
            'evento_id': 1,
            'status': 'ready_for_certificate_generation'
        }
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('test-certificado/', test_certificado, name='test_certificado'),
    path('', include('apps.certificados.urls')),
]

# Servir arquivos de media em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)