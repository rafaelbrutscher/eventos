from django.http import JsonResponse
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

def health_check(request):
    logger.info("Health check endpoint called")
    return JsonResponse({
        'status': 'healthy',
        'service': 'certificados-service',
        'timestamp': timezone.now().isoformat(),
        'endpoints': {
            'gerar_certificado': '/api/gerar-certificado/',
            'health': '/health/',
            'admin': '/admin/',
            'test': '/test-certificado/'
        }
    })

def test_certificado(request):
    logger.info(f"Test certificado endpoint called - Method: {request.method}")
    logger.info(f"Headers: {dict(request.headers)}")
    
    if request.method == 'POST':
        logger.info(f"Body: {request.body}")
    
    return JsonResponse({
        'status': 'test_ok',
        'method': request.method,
        'service': 'certificados-service',
        'timestamp': timezone.now().isoformat(),
        'message': 'Test endpoint working correctly'
    })