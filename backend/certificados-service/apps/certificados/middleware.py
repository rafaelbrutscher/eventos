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
        
        # Logs de requisições
        
        # Print direto
        print(f'\nREQUISIÇÃO HTTP INTERCEPTADA')
        print(f'Timestamp: {request_data["timestamp"]}')
        print(f'Método: {request_data["method"]} {request_data["url"]}')
        print(f'Host: {request_data["host"]} | IP: {request_data["remote_addr"]}')
        print(f'User-Agent: {request_data["user_agent"][:100]}')
        print(f'Content-Type: {request_data["content_type"]} | Length: {request_data["content_length"]}')
        print(f'Params: {request_data["query_params"]}')
        
        # 2. STDOUT DIRETO (FORÇAR SAÍDA IMEDIATA)
        sys.stdout.write(f"STDOUT LOG: {request.method} {request.get_full_path()} - {timezone.now()}\n")
        sys.stdout.flush()
        
        # 3. STDERR PARA GARANTIR
        sys.stderr.write(f"STDERR LOG: {request.method} {request.get_full_path()} - {timezone.now()}\n")
        sys.stderr.flush()
        
        # Log do body para POST/PUT/PATCH
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                body_content = request.body[:1000]  # Limitar a 1000 caracteres
                print(f'Body: {body_content}')
                request_data['body_preview'] = body_content.decode('utf-8', errors='ignore')
                sys.stdout.write(f"BODY: {body_content}\n")
                sys.stdout.flush()
            except Exception as e:
                print(f'Erro ao ler body: {str(e)}')
                request_data['body_error'] = str(e)
        
        print(f'FIM REQUISIÇÃO\n')
        
        # Múltiplos loggers
        log_message = f'REQUISIÇÃO: {json.dumps(request_data, ensure_ascii=False)}'
        logger.info(log_message)
        django_logger.info(log_message)
        root_logger.info(log_message)

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
        
        # Log no console
        print(f'\nRESPOSTA HTTP ENVIADA')
        print(f'URL: {response_data["url"]}')
        print(f'Status: {response_data["status_code"]}')
        print(f'Content-Type: {response_data["content_type"]}')
        print(f'Content-Length: {response_data["content_length"]}')
        
        # Mostrar preview do conteúdo da resposta
        if hasattr(response, 'content') and response.content:
            try:
                content_preview = response.content[:500]  # Primeiros 500 caracteres
                print(f'Conteúdo (preview): {content_preview}')
                response_data['content_preview'] = content_preview.decode('utf-8', errors='ignore')
            except Exception as e:
                print(f'Erro ao mostrar conteúdo: {str(e)}')
                response_data['content_error'] = str(e)
        
        print(f'FIM LOG RESPOSTA\n')
        
        # Log no arquivo
        logger.info(f'RESPOSTA HTTP: {json.dumps(response_data, ensure_ascii=False, indent=2)}')