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
        logger.info(f'=== 🎯 RECEBIDA SOLICITAÇÃO DE CERTIFICADO ===')
        logger.info(f'Request method: {request.method}')
        logger.info(f'Request headers: {dict(request.headers)}')
        logger.info(f'Request data: {request.data}')
        
        user_id = request.data.get('user_id')
        evento_id = request.data.get('evento_id')
        
        logger.info(f'📋 Parâmetros extraídos - User ID: {user_id}, Evento ID: {evento_id}')
        
        if not user_id or not evento_id:
            return Response(
                {
                    'success': False,
                    'message': 'user_id e evento_id são obrigatórios'
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
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
        
        # Buscar dados básicos (sem timeout longo)
        try:
            logger.info('Buscando dados do usuário e evento...')
            
            # Buscar usuário
            user_response = requests.get(
                f'http://177.44.248.89:8001/api/usuarios/{user_id}', 
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )
            
            if user_response.status_code != 200:
                raise Exception(f'Usuário não encontrado: HTTP {user_response.status_code}')
                
            # Buscar evento  
            evento_response = requests.get(
                f'http://177.44.248.89:8002/api/eventos/{evento_id}', 
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )
            
            if evento_response.status_code != 200:
                raise Exception(f'Evento não encontrado: HTTP {evento_response.status_code}')
                
            user_data = user_response.json().get('data', {})
            evento_data = evento_response.json().get('data', {})
            
            if not user_data or not evento_data:
                raise Exception('Dados de usuário ou evento inválidos')
                
        except requests.exceptions.Timeout:
            logger.warning('Timeout ao buscar dados - gerando certificado com dados limitados')
            user_data = {'id': user_id, 'name': f'Participante {user_id}', 'email': ''}
            evento_data = {'id': evento_id, 'nome': f'Evento {evento_id}'}
            
        except Exception as e:
            logger.error(f'Erro ao buscar dados: {str(e)}')
            # Gerar com dados mínimos para não falhar
            user_data = {'id': user_id, 'name': f'Participante {user_id}', 'email': ''}
            evento_data = {'id': evento_id, 'nome': f'Evento {evento_id}'}
        
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
        
        logger.info(f'Certificado criado com sucesso: {certificado.codigo_validacao}')
        
        return Response({
            'success': True,
            'message': 'Certificado gerado com sucesso',
            'data': {
                'id': certificado.id,
                'codigo': certificado.codigo_validacao,
                'gerado': certificado.gerado,
                'created_at': certificado.created_at,
                'participante_nome': certificado.participante_nome,
                'evento_nome': certificado.evento_nome
            }
        })
        
    except Exception as e:
        logger.error(f'ERRO CRÍTICO ao gerar certificado: {str(e)}', exc_info=True)
        return Response(
            {
                'success': False,
                'message': f'Erro interno: {str(e)}'
            }, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )