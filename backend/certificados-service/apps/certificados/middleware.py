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
        """Log detalhado da requisição HTTP - VERSÃO SUPER INTENSIVA"""
        
        # Preparar dados da requisição
        request_data = {
            'timestamp': timezone.now().isoformat(),
            'method': request.method,
            'url': request.get_full_path(),
            'scheme': request.scheme,
            'host': request.get_host(),
            'remote_addr': request.META.get('REMOTE_ADDR', 'N/A'),
            'user_agent': request.META.get('HTTP_USER_AGENT', 'N/A')[:200],
            'content_type': request.META.get('CONTENT_TYPE', 'N/A'),
            'content_length': request.META.get('CONTENT_LENGTH', '0'),
            'query_params': dict(request.GET),
        }
        
        # Log da requisição
        print(f'\nREQUISICAO: {request_data["method"]} {request_data["url"]}')
        print(f'IP: {request_data["remote_addr"]} | Host: {request_data["host"]}')
        if request_data["query_params"]:
            print(f'Params: {request_data["query_params"]}')
        
        # Log do body para POST/PUT/PATCH
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                body_content = request.body[:500]  # Limitar a 500 caracteres
                print(f'Body: {body_content}')
                request_data['body_preview'] = body_content.decode('utf-8', errors='ignore')
            except Exception as e:
                print(f'Erro ao ler body: {str(e)}')
                request_data['body_error'] = str(e)
        
        # Log em arquivo
        logger.info(f'REQUISICAO: {json.dumps(request_data, ensure_ascii=False)}')

    def log_response(self, request, response):
        """Log da resposta HTTP"""
        
        response_data = {
            'timestamp': timezone.now().isoformat(),
            'url': request.get_full_path(),
            'method': request.method,
            'status_code': response.status_code,
            'content_type': response.get('Content-Type', 'N/A'),
            'content_length': len(response.content) if hasattr(response, 'content') else 0
        }
        
        # Log da resposta
        print(f'RESPOSTA: {response_data["status_code"]} para {response_data["method"]} {response_data["url"]}')
        
        # Log em arquivo
        logger.info(f'RESPOSTA HTTP: {json.dumps(response_data, ensure_ascii=False)}')