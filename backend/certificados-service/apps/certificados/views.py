from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.template import Template, Context
from django.conf import settings
from django.utils import timezone
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
    
    def dispatch(self, request, *args, **kwargs):
        """Log para requisições no ViewSet"""
        print(f'\nAPI CERTIFICADOS CHAMADA')
        print(f'Método: {request.method}')
        print(f'URL: {request.get_full_path()}')
        print(f'IP: {request.META.get("REMOTE_ADDR", "N/A")}')
        print(f'User-Agent: {request.META.get("HTTP_USER_AGENT", "N/A")[:100]}')
        print(f'Params: {dict(request.GET)}')
        if request.method in ['POST', 'PUT', 'PATCH']:
            print(f'Body: {request.body[:500]}')
        print(f'FIM LOG REQUEST')
        
        logger.info(f'\nAPI CERTIFICADOS CHAMADA')
        logger.info(f'Método: {request.method} | URL: {request.get_full_path()}')
        logger.info(f'IP: {request.META.get("REMOTE_ADDR", "N/A")} | Params: {dict(request.GET)}')
        if request.method in ['POST', 'PUT', 'PATCH']:
            logger.info(f'Body: {request.body[:500]}')
            
        return super().dispatch(request, *args, **kwargs)
    
    def get_queryset(self):
        print(f'GET_QUERYSET chamado')
        logger.info(f'GET_QUERYSET - Listando certificados')
        
        queryset = super().get_queryset()
        
        # Filtros opcionais
        evento_id = self.request.query_params.get('evento_id')
        participante_id = self.request.query_params.get('participante_id')
        
        print(f'Filtros aplicados - evento_id: {evento_id}, participante_id: {participante_id}')
        logger.info(f'Filtros: evento_id={evento_id}, participante_id={participante_id}')
        
        if evento_id:
            queryset = queryset.filter(evento_id=evento_id)
            print(f'Filtrado por evento_id: {evento_id}')
        
        if participante_id:
            queryset = queryset.filter(participante_id=participante_id)
            print(f'Filtrado por participante_id: {participante_id}')
        
        total = queryset.count()
        print(f'Total de certificados encontrados: {total}')
        logger.info(f'Total de certificados retornados: {total}')
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['get'], url_path='validar/(?P<codigo>[^/.]+)')
    def validar(self, request, codigo=None):
        """Validar um certificado pelo código"""
        
        print(f'\nVALIDAÇÃO DE CERTIFICADO (ViewSet)')
        print(f'Código recebido: {codigo}')
        logger.info(f'\nVALIDAÇÃO DE CERTIFICADO (ViewSet)')
        logger.info(f'Código para validação: {codigo}')
        
        if not codigo:
            print('Código não fornecido')
            logger.error('Código de validação não fornecido')
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
def validar_certificado_direto(request, codigo):
    """Função direta para validar certificado - rota: /api/certificados/validar/{codigo}/"""
    
    # Log da requisição
    print(f'\nVALIDAÇÃO DIRETA DE CERTIFICADO')
    print(f'Método: {request.method}')
    print(f'URL: {request.get_full_path()}')
    print(f'IP: {request.META.get("REMOTE_ADDR", "N/A")}')
    print(f'Código: {codigo}')
    print(f'Timestamp: {timezone.now()}')
    print(f'INICIANDO VALIDAÇÃO')
    
    logger.info(f'\nVALIDAÇÃO DIRETA DE CERTIFICADO')
    logger.info(f'Método: {request.method} | URL: {request.get_full_path()}')
    logger.info(f'IP: {request.META.get("REMOTE_ADDR", "N/A")} | Código: {codigo}')
    logger.info(f'Timestamp: {timezone.now()}')
    
    if not codigo:
        return Response(
            {'erro': 'Código de validação é obrigatório'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        certificado = get_object_or_404(Certificado, codigo_validacao=codigo)
        
        logger.info(f'Certificado encontrado: {certificado.participante_nome} - {certificado.evento_nome}')
        
        return Response({
            'valido': True,
            'codigo': certificado.codigo_validacao,
            'participante_nome': certificado.participante_nome,
            'participante_email': certificado.participante_email,
            'evento_nome': certificado.evento_nome,
            'data_emissao': certificado.created_at,
            'mensagem': 'Certificado válido'
        })
        
    except Http404:
        logger.warning(f'Certificado não encontrado: {codigo}')
        
        return Response({
            'valido': False,
            'codigo': codigo,
            'mensagem': 'Certificado não encontrado ou inválido'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([AllowAny])
def listar_eventos_participados(request):
    """Lista eventos que o usuário participou e pode gerar certificado"""
    
    # Log da requisição
    print(f'\nLISTAGEM DE EVENTOS PARTICIPADOS')
    print(f'Método: {request.method}')
    print(f'URL: {request.get_full_path()}')
    print(f'IP: {request.META.get("REMOTE_ADDR", "N/A")}')
    print(f'Params: {dict(request.GET)}')
    print(f'Timestamp: {timezone.now()}')
    print(f'PROCESSANDO LISTAGEM')
    
    logger.info(f'\nLISTAGEM DE EVENTOS PARTICIPADOS')
    logger.info(f'Método: {request.method} | URL: {request.get_full_path()}')
    logger.info(f'IP: {request.META.get("REMOTE_ADDR", "N/A")} | Params: {dict(request.GET)}')
    logger.info(f'Timestamp: {timezone.now()}')
    
    try:
        # Obter user_id do parâmetro
        user_id = request.GET.get('user_id')
        print(f'User ID recebido: {user_id}')
        logger.info(f'User ID recebido: {user_id}')
        
        if not user_id:
            logger.error('user_id não fornecido')
            return Response(
                {'erro': 'user_id é obrigatório'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f'Buscando presenças do usuário {user_id}')
        
        # Buscar presenças com múltiplas URLs de fallback
        presencas_urls = [
            f'http://eventos_presenca:8000/api/presencas/usuario/{user_id}',
            f'http://127.0.0.1:8004/api/presencas/usuario/{user_id}',
            f'http://177.44.248.89:8004/api/presencas/usuario/{user_id}'
        ]
        
        presencas_response = None
        for url in presencas_urls:
            try:
                logger.info(f'Tentando buscar presenças em: {url}')
                presencas_response = requests.get(
                    url,
                    timeout=5,  # Timeout menor para cada tentativa
                    headers={'Content-Type': 'application/json'}
                )
                
                if presencas_response.status_code == 200:
                    logger.info(f'Presenças encontradas em: {url}')
                    break
                else:
                    logger.warning(f'Status {presencas_response.status_code} em: {url}')
                    presencas_response = None
                    
            except requests.exceptions.Timeout:
                logger.warning(f'Timeout em: {url}')
                continue
            except requests.exceptions.RequestException as e:
                logger.error(f'Erro de rede em {url}: {str(e)}')
                continue
            except Exception as e:
                logger.error(f'Erro inesperado em {url}: {str(e)}')
                continue
        
        # Se não conseguiu buscar presenças, retorna lista vazia
        if not presencas_response or presencas_response.status_code != 200:
            logger.warning('Não foi possível buscar presenças em nenhuma URL')
            return Response(
                {'success': True, 'data': [], 'total': 0, 'message': 'Serviço de presenças temporáriamente indisponível'}, 
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
            
            # Buscar dados do evento com múltiplas URLs
            evento_urls = [
                f'http://eventos_eventos:8000/api/eventos/{evento_id}',
                f'http://127.0.0.1:8002/api/eventos/{evento_id}',
                f'http://177.44.248.89:8002/api/eventos/{evento_id}'
            ]
            
            evento = None
            for evento_url in evento_urls:
                try:
                    logger.info(f'Buscando evento {evento_id} em: {evento_url}')
                    evento_response = requests.get(evento_url, timeout=3)
                    
                    if evento_response.status_code == 200:
                        evento = evento_response.json().get('data')
                        if evento:
                            logger.info(f'Evento {evento_id} encontrado: {evento.get("nome", "N/A")}')
                            break
                    
                    logger.warning(f'Status {evento_response.status_code} para evento {evento_id} em {evento_url}')
                    
                except requests.exceptions.Timeout:
                    logger.warning(f'Timeout buscando evento {evento_id} em {evento_url}')
                    continue
                except requests.exceptions.RequestException as e:
                    logger.error(f'Erro de rede buscando evento {evento_id} em {evento_url}: {str(e)}')
                    continue
                except Exception as e:
                    logger.error(f'Erro inesperado buscando evento {evento_id} em {evento_url}: {str(e)}')
                    continue
            
            if not evento:
                logger.warning(f'Evento {evento_id} não encontrado em nenhuma URL')
                continue
            
            # Verificar se evento já terminou (pode gerar certificado)
            try:
                data_fim_str = evento.get('data_fim', '')
                if data_fim_str:
                    from datetime import datetime
                    if 'T' in data_fim_str:
                        data_fim = datetime.fromisoformat(data_fim_str.replace('Z', '+00:00'))
                    else:
                        data_fim = datetime.strptime(data_fim_str, '%Y-%m-%d')
                        data_fim = timezone.make_aware(data_fim)
                    
                    pode_gerar_certificado = data_fim < timezone.now()
                else:
                    pode_gerar_certificado = True  # Se não tem data fim, permite gerar
            except Exception as e:
                logger.warning(f'Erro ao processar data do evento {evento_id}: {str(e)}')
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


@api_view(['GET'])
@permission_classes([AllowAny])
def listar_meus_certificados(request):
    """Lista diretamente os certificados do usuário - API simplificada"""
    
    # Log da requisição
    print(f'\nLISTAGEM DE CERTIFICADOS')
    print(f'Método: {request.method}')
    print(f'URL: {request.get_full_path()}')
    print(f'IP: {request.META.get("REMOTE_ADDR", "N/A")}')
    print(f'Params: {dict(request.GET)}')
    print(f'Timestamp: {timezone.now()}')
    print(f'PROCESSANDO LISTAGEM')
    
    logger.info(f'\nLISTAGEM DE CERTIFICADOS')
    logger.info(f'Método: {request.method} | URL: {request.get_full_path()}')
    logger.info(f'IP: {request.META.get("REMOTE_ADDR", "N/A")} | Params: {dict(request.GET)}')
    logger.info(f'Timestamp: {timezone.now()}')
    
    try:
        user_id = request.GET.get('user_id')
        print(f'User ID para certificados: {user_id}')
        logger.info(f'🔍 User ID para certificados: {user_id}')
        
        if not user_id:
            logger.error('user_id não fornecido para certificados')
            return Response(
                {'erro': 'user_id é obrigatório'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar certificados diretamente
        certificados = Certificado.objects.filter(
            participante_id=user_id,
            gerado=True
        ).order_by('-created_at')
        
        certificados_list = []
        for cert in certificados:
            certificados_list.append({
                'id': cert.id,
                'codigo_validacao': cert.codigo_validacao,
                'participante_nome': cert.participante_nome,
                'participante_email': cert.participante_email,
                'evento_nome': cert.evento_nome,
                'evento_id': cert.evento_id,
                'gerado': cert.gerado,
                'disponivel_usuario': cert.disponivel_usuario,
                'data_emissao': cert.created_at.isoformat() if cert.created_at else None,
                'can_download': cert.gerado and cert.disponivel_usuario
            })
        
        logger.info(f'Encontrados {len(certificados_list)} certificados para o usuário {user_id}')
        
        return Response({
            'success': True,
            'data': certificados_list,
            'total': len(certificados_list)
        })
        
    except Exception as e:
        logger.error(f'Erro ao listar certificados do usuário: {str(e)}', exc_info=True)
        return Response({
            'success': False,
            'erro': 'Erro interno ao buscar certificados',
            'detalhes': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def gerar_certificado_usuario(request):
    """Permite ao usuário gerar seu próprio certificado"""
    
    # Log da requisição
    print(f'\nGERAÇÃO DE CERTIFICADO PELO USUÁRIO')
    print(f'Método: {request.method}')
    print(f'URL: {request.get_full_path()}')
    print(f'IP: {request.META.get("REMOTE_ADDR", "N/A")}')
    print(f'Body: {request.data}')
    print(f'Timestamp: {timezone.now()}')
    print(f'PROCESSANDO GERAÇÃO')
    
    logger.info(f'\nGERAÇÃO DE CERTIFICADO PELO USUÁRIO')
    logger.info(f'Método: {request.method} | URL: {request.get_full_path()}')
    logger.info(f'IP: {request.META.get("REMOTE_ADDR", "N/A")} | Body: {request.data}')
    logger.info(f'Timestamp: {timezone.now()}')
    
    try:
        evento_id = request.data.get('evento_id')
        user_id = request.data.get('user_id')
        
        print(f'Parâmetros: evento_id={evento_id}, user_id={user_id}')
        logger.info(f'Parâmetros: evento_id={evento_id}, user_id={user_id}')
        
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
    
    # Log da requisição
    print(f'\nDOWNLOAD DE CERTIFICADO')
    print(f'Método: {request.method}')
    print(f'URL: {request.get_full_path()}')
    print(f'IP: {request.META.get("REMOTE_ADDR", "N/A")}')
    print(f'Certificado ID: {certificado_id}')
    print(f'Timestamp: {timezone.now()}')
    print(f'PROCESSANDO DOWNLOAD')
    
    logger.info(f'\nDOWNLOAD DE CERTIFICADO')
    logger.info(f'Método: {request.method} | URL: {request.get_full_path()}')
    logger.info(f'IP: {request.META.get("REMOTE_ADDR", "N/A")} | Certificado ID: {certificado_id}')
    logger.info(f'Timestamp: {timezone.now()}')
    
    try:
        certificado = get_object_or_404(Certificado, id=certificado_id)
        print(f'Certificado encontrado: {certificado.participante_nome} - {certificado.evento_nome}')
        logger.info(f'Certificado encontrado: {certificado.participante_nome} - {certificado.evento_nome}')
        
        # Tentar buscar dados atuais com múltiplas URLs, mas usar dados do certificado como fallback
        user_data = None
        evento_data = None
        
        # Tentar buscar usuário com múltiplas URLs
        user_urls = [
            f'http://eventos_auth:8000/api/usuarios/{certificado.participante_id}',
            f'http://127.0.0.1:8001/api/usuarios/{certificado.participante_id}',
            f'http://177.44.248.89:8001/api/usuarios/{certificado.participante_id}'
        ]
        
        for user_url in user_urls:
            try:
                user_response = requests.get(user_url, timeout=3)
                if user_response.status_code == 200:
                    user_data = user_response.json()['data']
                    break
            except:
                continue
        
        # Se não conseguiu buscar usuário, usar dados do certificado
        if not user_data:
            user_data = {
                'id': certificado.participante_id,
                'name': certificado.participante_nome,
                'email': certificado.participante_email
            }
        
        # Tentar buscar evento com múltiplas URLs
        evento_urls = [
            f'http://eventos_eventos:8000/api/eventos/{certificado.evento_id}',
            f'http://127.0.0.1:8002/api/eventos/{certificado.evento_id}',
            f'http://177.44.248.89:8002/api/eventos/{certificado.evento_id}'
        ]
        
        for evento_url in evento_urls:
            try:
                evento_response = requests.get(evento_url, timeout=3)
                if evento_response.status_code == 200:
                    evento_data = evento_response.json()['data']
                    break
            except:
                continue
        
        # Se não conseguiu buscar evento, usar dados básicos do certificado
        if not evento_data:
            evento_data = {
                'id': certificado.evento_id,
                'nome': certificado.evento_nome,
                'data_inicio': None,
                'data_fim': None,
                'descricao': certificado.evento_nome
            }
        
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
