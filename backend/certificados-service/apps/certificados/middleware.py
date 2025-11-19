import logging
import sys
import os
from django.utils import timezone
import json

# Loggers para capturar requisições
logger = logging.getLogger(__name__)
django_logger = logging.getLogger('django')
root_logger = logging.getLogger()

# Log de inicialização do middleware
print("Middleware de log carregado")
print(f"Timestamp de carregamento: {timezone.now()}")
sys.stdout.flush()


class LogTodosRequestsMiddleware:
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # LOG ANTES DO PROCESSAMENTO (REQUEST)
        self.log_request(request)
        
        # Processar requisição
        response = self.get_response(request)
        
        # LOG DEPOIS DO PROCESSAMENTO (RESPONSE)
        self.log_response(request, response)
        
        return response

    def log_request(self, request):
        """Log compacto da requisição HTTP"""
        
        # Preparar body seguro
        body_safe = {}
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                if hasattr(request, 'body') and request.body:
                    body_content = request.body.decode('utf-8', errors='ignore')[:200]
                    if body_content:
                        body_safe = {'body_preview': body_content}
                    else:
                        body_safe = {'body': 'empty'}
            except Exception:
                body_safe = {'body': 'error'}
        
        # Log compacto formato padrão
        log_message = f"[CERTIFICADOS-SERVICE] → {request.method} {request.get_full_path()} | IP: {request.META.get('REMOTE_ADDR', 'N/A')} | Body: {json.dumps(body_safe)}"
        
        print(log_message)
        logger.info(log_message)

    def log_response(self, request, response):
        """Log compacto da resposta HTTP"""
        
        content_length = len(response.content) if hasattr(response, 'content') else 0
        
        # Log compacto formato padrão  
        log_message = f"[CERTIFICADOS-SERVICE] ← {request.method} {request.get_full_path()} | Status: {response.status_code} | Size: {content_length:,} bytes"
        
        print(log_message)
        logger.info(log_message)