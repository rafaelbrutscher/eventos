from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.template import Template, Context
from django.conf import settings
import logging
import os
import requests

from .models import Certificado
from .serializers import CertificadoSerializer, CertificadoValidacaoSerializer
from apps.core.utils import preparar_contexto_template, criar_nome_arquivo_pdf, criar_diretorio_certificados

logger = logging.getLogger(__name__)


class CertificadoViewSet(viewsets.ModelViewSet):
    """ViewSet simplificado para gerenciar certificados"""
    
    queryset = Certificado.objects.all()
    serializer_class = CertificadoSerializer
    permission_classes = [AllowAny]  # Simplificado para desenvolvimento
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionais
        evento_id = self.request.query_params.get('evento_id')
        participante_id = self.request.query_params.get('participante_id')
        
        if evento_id:
            queryset = queryset.filter(evento_id=evento_id)
        
        if participante_id:
            queryset = queryset.filter(participante_id=participante_id)
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['get'], url_path='validar/(?P<codigo>[^/.]+)')
    def validar(self, request, codigo=None):
        """Validar um certificado pelo código"""
        
        if not codigo:
            return Response(
                {'erro': 'código de validação é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            certificado = get_object_or_404(Certificado, codigo_validacao=codigo)
            
            serializer = CertificadoValidacaoSerializer({
                'valido': True,
                'codigo': certificado.codigo_validacao,
                'participante_nome': certificado.participante_nome,
                'evento_nome': certificado.evento_nome,
                'mensagem': 'Certificado válido'
            })
            
            return Response(serializer.data)
            
        except Http404:
            serializer = CertificadoValidacaoSerializer({
                'valido': False,
                'codigo': codigo,
                'mensagem': 'Certificado não encontrado ou inválido'
            })
            
            return Response(serializer.data, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([AllowAny])
def listar_eventos_participados(request):
    """Lista eventos que o usuário participou e pode gerar certificado"""
    try:
        # Obter user_id do parâmetro
        user_id = request.GET.get('user_id')
        if not user_id:
            return Response(
                {'erro': 'user_id é obrigatório'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar presenças do usuário consultando diretamente o presença-service
        try:
            presencas_response = requests.get(
                f'http://177.44.248.89:8004/api/presencas/usuario/{user_id}',
                timeout=10  # Timeout de 10 segundos
            )
            
            if presencas_response.status_code != 200:
                logger.warning(f'Erro ao buscar presenças: status {presencas_response.status_code}')
                return Response(
                    {'success': True, 'data': [], 'total': 0}, 
                    status=status.HTTP_200_OK
                )
        except requests.exceptions.Timeout:
            logger.warning('Timeout ao buscar presenças do usuário')
            return Response(
                {'success': True, 'data': [], 'total': 0}, 
                status=status.HTTP_200_OK
            )
        except requests.exceptions.RequestException as e:
            logger.error(f'Erro de rede ao buscar presenças: {str(e)}')
            return Response(
                {'success': True, 'data': [], 'total': 0}, 
                status=status.HTTP_200_OK
            )
        
        presencas = presencas_response.json().get('data', [])
        eventos_participados = []
        eventos_processados = set()
        
        # Limitar processamento para evitar timeouts
        max_eventos = 50  # Máximo de 50 eventos por vez
        presencas_limitadas = presencas[:max_eventos] if len(presencas) > max_eventos else presencas
        
        for presenca in presencas_limitadas:
            evento_id = presenca['evento_id']
            
            # Evitar duplicatas
            if evento_id in eventos_processados:
                continue
            eventos_processados.add(evento_id)
            
            # Buscar dados do evento
            try:
                evento_response = requests.get(
                    f'http://177.44.248.89:8002/api/eventos/{evento_id}',
                    timeout=5  # Timeout menor para cada evento
                )
                
                if evento_response.status_code != 200:
                    logger.warning(f'Evento {evento_id} não encontrado ou erro no serviço')
                    continue
                    
                evento = evento_response.json().get('data')
                if not evento:
                    logger.warning(f'Dados do evento {evento_id} inválidos')
                    continue
                    
            except requests.exceptions.Timeout:
                logger.warning(f'Timeout ao buscar evento {evento_id}')
                continue
            except requests.exceptions.RequestException as e:
                logger.error(f'Erro ao buscar evento {evento_id}: {str(e)}')
                continue
            except Exception as e:
                logger.error(f'Erro inesperado ao processar evento {evento_id}: {str(e)}')
                continue
                
                # Verificar se evento já terminou (pode gerar certificado)
                from datetime import datetime
                from django.utils import timezone
                
                try:
                    data_fim_str = evento.get('data_fim', '')
                    if data_fim_str:
                        if 'T' in data_fim_str:
                            data_fim = datetime.fromisoformat(data_fim_str.replace('Z', '+00:00'))
                        else:
                            data_fim = datetime.strptime(data_fim_str, '%Y-%m-%d')
                            data_fim = timezone.make_aware(data_fim)
                        
                        pode_gerar_certificado = data_fim < timezone.now()
                    else:
                        pode_gerar_certificado = True  # Se não tem data fim, permite gerar
                except:
                    pode_gerar_certificado = True  # Em caso de erro, permite gerar
                
                # Verificar se certificado já existe
                certificado_existente = Certificado.objects.filter(
                    evento_id=evento_id,
                    participante_id=user_id
                ).first()
                
                eventos_participados.append({
                    'evento_id': evento_id,
                    'nome': evento['nome'],
                    'descricao': evento.get('descricao', ''),
                    'data_inicio': evento.get('data_inicio'),
                    'data_fim': evento.get('data_fim'),
                    'pode_gerar_certificado': pode_gerar_certificado,
                    'certificado_gerado': certificado_existente is not None,
                    'certificado_codigo': certificado_existente.codigo_validacao if certificado_existente else None,
                    'certificado_id': certificado_existente.id if certificado_existente else None,
                    'data_presenca': presenca.get('data_hora')
                })
        
        return Response({
            'success': True,
            'data': eventos_participados,
            'total': len(eventos_participados)
        })
        
    except Exception as e:
        logger.error(f'Erro crítico ao listar eventos participados: {str(e)}', exc_info=True)
        # Retornar lista vazia em vez de erro para não quebrar o frontend
        return Response(
            {'success': True, 'data': [], 'total': 0}, 
            status=status.HTTP_200_OK
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def gerar_certificado_usuario(request):
    """Permite ao usuário gerar seu próprio certificado"""
    try:
        evento_id = request.data.get('evento_id')
        user_id = request.data.get('user_id')
        
        if not evento_id or not user_id:
            return Response(
                {'erro': 'evento_id e user_id são obrigatórios'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se certificado já existe
        certificado_existente = Certificado.objects.filter(
            evento_id=evento_id,
            participante_id=user_id
        ).first()
        
        if certificado_existente:
            return Response({
                'success': True,
                'message': 'Certificado já existe',
                'certificado': {
                    'id': certificado_existente.id,
                    'codigo': certificado_existente.codigo_validacao,
                    'gerado': certificado_existente.gerado,
                    'url_download': f'/api/certificados/{certificado_existente.id}/download/',
                    'url_validacao': f'http://177.44.248.89:8005/api/certificados/validar/{certificado_existente.codigo_validacao}/'
                }
            })
        
        # Buscar dados do usuário e evento
        user_response = requests.get(f'http://177.44.248.89:8001/api/usuarios/{user_id}', timeout=5)
        evento_response = requests.get(f'http://177.44.248.89:8002/api/eventos/{evento_id}', timeout=5)
        
        if user_response.status_code != 200:
            return Response(
                {'erro': 'Usuário não encontrado'}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        if evento_response.status_code != 200:
            return Response(
                {'erro': 'Evento não encontrado'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        user_data = user_response.json()['data']
        evento_data = evento_response.json()['data']
        
        # Criar certificado simples (sem PDF por enquanto)
        certificado = Certificado.objects.create(
            evento_id=evento_data['id'],
            participante_id=user_data['id'],
            participante_nome=user_data['name'],
            participante_email=user_data['email'],
            evento_nome=evento_data['nome'],
            gerado=True,
            disponivel_usuario=True
        )
        
        return Response({
            'success': True,
            'message': 'Certificado gerado com sucesso',
            'certificado': {
                'id': certificado.id,
                'codigo': certificado.codigo_validacao,
                'gerado': certificado.gerado,
                'url_download': f'/api/certificados/{certificado.id}/download/',
                'url_validacao': f'http://177.44.248.89:8005/api/certificados/validar/{certificado.codigo_validacao}/'
            }
        })
        
    except Exception as e:
        logger.error(f'Erro ao gerar certificado do usuário: {str(e)}')
        return Response(
            {'erro': f'Erro interno do servidor: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def download_certificado(request, certificado_id):
    """Visualizar/Imprimir certificado usando template existente"""
    try:
        certificado = get_object_or_404(Certificado, id=certificado_id)
        
        # Buscar dados atuais do usuário e evento
        user_response = requests.get(f'http://177.44.248.89:8001/api/usuarios/{certificado.participante_id}', timeout=5)
        evento_response = requests.get(f'http://177.44.248.89:8002/api/eventos/{certificado.evento_id}', timeout=5)
        
        if user_response.status_code != 200 or evento_response.status_code != 200:
            return HttpResponse(
                '<h1>Erro ao carregar dados do certificado</h1>', 
                content_type='text/html'
            )
        
        user_data = user_response.json()['data']
        evento_data = evento_response.json()['data']
        
        # Preparar contexto para o template
        contexto = preparar_contexto_template(evento_data, user_data, certificado.codigo_validacao)
        
        # Carregar e renderizar template
        with open('templates/certificados/template_base.html', 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        template = Template(template_content)
        html_renderizado = template.render(Context(contexto))
        
        return HttpResponse(html_renderizado, content_type='text/html')
            
    except Exception as e:
        logger.error(f'Erro ao gerar certificado: {str(e)}')
        return HttpResponse(
            f'<h1>Erro ao gerar certificado</h1><p>{str(e)}</p>', 
            content_type='text/html'
        )
