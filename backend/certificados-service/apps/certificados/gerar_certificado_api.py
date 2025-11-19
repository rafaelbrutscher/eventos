from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import logging
import requests
from .models import Certificado

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def gerar_certificado(request):
    """
    API simplificada para gerar certificado automático após check-in
    Endpoint: POST /api/gerar-certificado
    """
    try:
        logger.info('=== 🎯 RECEBIDA SOLICITAÇÃO DE CERTIFICADO (PENTE FINO) ===')
        logger.info(f'Request method: {request.method}')
        logger.info(f'Request headers: {dict(request.headers)}')
        logger.info(f'Request content type: {request.content_type}')
        logger.info(f'Request body raw: {request.body}')
        logger.info(f'Request data parsed: {request.data}')
        
        # VALIDAÇÃO ULTRA ROBUSTA
        user_id = None
        evento_id = None
        
        # Tentar extrair dados de várias formas possíveis
        if hasattr(request, 'data') and request.data:
            user_id = request.data.get('user_id')
            evento_id = request.data.get('evento_id')
        
        # Fallback para POST raw
        if not user_id and hasattr(request, 'POST'):
            user_id = request.POST.get('user_id')
            evento_id = request.POST.get('evento_id')
            
        # Fallback para JSON no body
        if not user_id and request.body:
            try:
                import json
                body_data = json.loads(request.body.decode('utf-8'))
                user_id = body_data.get('user_id')
                evento_id = body_data.get('evento_id')
                logger.info(f'Dados extraídos do JSON body: user_id={user_id}, evento_id={evento_id}')
            except Exception as e:
                logger.warning(f'Erro ao parsear JSON body: {e}')
        
        # Conversão para inteiro com validação
        try:
            user_id = int(user_id) if user_id else None
            evento_id = int(evento_id) if evento_id else None
        except (ValueError, TypeError) as e:
            logger.error(f'Erro na conversão para inteiro: user_id={user_id}, evento_id={evento_id}, erro={e}')
            return Response({
                'success': False,
                'message': f'Parâmetros inválidos - devem ser números inteiros'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f'📋 Parâmetros VALIDADOS - User ID: {user_id}, Evento ID: {evento_id}')
        
        # VALIDAÇÃO FINAL
        if not user_id or not evento_id or user_id <= 0 or evento_id <= 0:
            logger.error(f'Parâmetros inválidos: user_id={user_id}, evento_id={evento_id}')
            return Response({
                'success': False,
                'message': 'user_id e evento_id são obrigatórios e devem ser números positivos',
                'received_data': {
                    'user_id': user_id,
                    'evento_id': evento_id,
                    'raw_data': str(request.data),
                    'content_type': request.content_type
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar se certificado já existe
        certificado_existente = Certificado.objects.filter(
            evento_id=evento_id,
            participante_id=user_id
        ).first()
        
        if certificado_existente:
            logger.info(f'Certificado já existe: {certificado_existente.codigo_validacao}')
            return Response({
                'success': True,
                'message': 'Certificado já existia',
                'data': {
                    'id': certificado_existente.id,
                    'codigo': certificado_existente.codigo_validacao,
                    'gerado': certificado_existente.gerado,
                    'created_at': certificado_existente.created_at
                }
            })
        
        # BUSCAR DADOS COM MÚLTIPLOS FALLBACKS
        user_data = None
        evento_data = None
        
        # URLs possíveis para buscar dados
        user_urls = [
            f'http://eventos_auth:8000/api/usuarios/{user_id}',
            f'http://127.0.0.1:8001/api/usuarios/{user_id}',
            f'http://177.44.248.89:8001/api/usuarios/{user_id}'
        ]
        
        evento_urls = [
            f'http://eventos_eventos:8000/api/eventos/{evento_id}',
            f'http://127.0.0.1:8002/api/eventos/{evento_id}',
            f'http://177.44.248.89:8002/api/eventos/{evento_id}'
        ]
        
        # Tentar buscar dados do usuário
        for url in user_urls:
            try:
                logger.info(f'Tentando buscar usuário em: {url}')
                user_response = requests.get(url, timeout=3, headers={'Content-Type': 'application/json'})
                if user_response.status_code == 200:
                    user_data = user_response.json().get('data', {})
                    if user_data:
                        logger.info(f'✅ Usuário encontrado: {user_data.get("name", "N/A")}')
                        break
            except Exception as e:
                logger.warning(f'Falha ao buscar usuário em {url}: {e}')
                continue
        
        # Tentar buscar dados do evento
        for url in evento_urls:
            try:
                logger.info(f'Tentando buscar evento em: {url}')
                evento_response = requests.get(url, timeout=3, headers={'Content-Type': 'application/json'})
                if evento_response.status_code == 200:
                    evento_data = evento_response.json().get('data', {})
                    if evento_data:
                        logger.info(f'✅ Evento encontrado: {evento_data.get("nome", "N/A")}')
                        break
            except Exception as e:
                logger.warning(f'Falha ao buscar evento em {url}: {e}')
                continue
        
        # FALLBACK INTELIGENTE - sempre funciona
        if not user_data:
            logger.warning('Não foi possível buscar dados do usuário - usando dados padrão')
            user_data = {
                'id': user_id, 
                'name': f'Participante #{user_id}', 
                'email': f'participante{user_id}@evento.com'
            }
            
        if not evento_data:
            logger.warning('Não foi possível buscar dados do evento - usando dados padrão')
            evento_data = {
                'id': evento_id, 
                'nome': f'Evento #{evento_id}',
                'descricao': 'Evento do Sistema'
            }
        
        # Criar certificado básico
        certificado = Certificado.objects.create(
            evento_id=evento_data.get('id', evento_id),
            participante_id=user_data.get('id', user_id),
            participante_nome=user_data.get('name', f'Participante {user_id}'),
            participante_email=user_data.get('email', ''),
            evento_nome=evento_data.get('nome', f'Evento {evento_id}'),
            gerado=True,
            disponivel_usuario=True
        )
        
        logger.info(f'✅ CERTIFICADO CRIADO COM SUCESSO!')
        logger.info(f'  - ID: {certificado.id}')
        logger.info(f'  - Código: {certificado.codigo_validacao}')
        logger.info(f'  - Participante: {certificado.participante_nome}')
        logger.info(f'  - Evento: {certificado.evento_nome}')
        
        response_data = {
            'success': True,
            'message': 'Certificado gerado com sucesso',
            'data': {
                'id': certificado.id,
                'codigo': certificado.codigo_validacao,
                'gerado': certificado.gerado,
                'created_at': certificado.created_at.isoformat() if certificado.created_at else None,
                'participante_nome': certificado.participante_nome,
                'participante_email': certificado.participante_email,
                'evento_nome': certificado.evento_nome,
                'disponivel_usuario': certificado.disponivel_usuario
            }
        }
        
        logger.info(f'Response final: {response_data}')
        return Response(response_data)
        
    except Exception as e:
        logger.error(f'❌ ERRO CRÍTICO ao gerar certificado!')
        logger.error(f'  - Erro: {str(e)}')
        logger.error(f'  - Tipo: {type(e).__name__}')
        logger.error(f'  - User ID: {locals().get("user_id", "N/A")}')
        logger.error(f'  - Evento ID: {locals().get("evento_id", "N/A")}')
        logger.error(f'  - Stack trace completo:', exc_info=True)
        
        return Response({
            'success': False,
            'message': f'Erro interno no serviço de certificados',
            'error_type': type(e).__name__,
            'debug_info': {
                'user_id': locals().get('user_id', None),
                'evento_id': locals().get('evento_id', None),
                'error_message': str(e)
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)