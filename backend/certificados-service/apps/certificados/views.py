from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
import logging

from .models import Certificado, EventoProcessado
from .serializers import CertificadoSerializer, EventoProcessadoSerializer
from .services import certificado_service
from .tasks import (
    gerar_certificados_evento, 
    gerar_certificado_individual,
    enviar_certificado_email,
    verificar_eventos_terminados
)

logger = logging.getLogger(__name__)


class CertificadoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para gerenciar certificados"""
    
    queryset = Certificado.objects.all()
    serializer_class = CertificadoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionais
        evento_id = self.request.query_params.get('evento_id')
        participante_id = self.request.query_params.get('participante_id')
        status_param = self.request.query_params.get('status')
        
        if evento_id:
            queryset = queryset.filter(evento_id=evento_id)
        
        if participante_id:
            queryset = queryset.filter(participante_id=participante_id)
            
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def gerar_por_evento(self, request):
        """Gerar certificados para um evento específico"""
        
        evento_id = request.data.get('evento_id')
        forcar_regeneracao = request.data.get('forcar_regeneracao', False)
        enviar_email = request.data.get('enviar_email', True)
        
        if not evento_id:
            return Response(
                {'erro': 'evento_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Agendar geração assíncrona
            task = gerar_certificados_evento.delay(
                evento_id, forcar_regeneracao, enviar_email
            )
            
            logger.info(f"Geração de certificados agendada para evento {evento_id} - Task: {task.id}")
            
            return Response({
                'mensagem': 'Geração de certificados agendada com sucesso',
                'evento_id': evento_id,
                'task_id': task.id
            })
            
        except Exception as e:
            logger.error(f"Erro ao agendar geração de certificados: {e}")
            return Response(
                {'erro': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def gerar_individual(self, request):
        """Gerar certificado individual"""
        
        evento_id = request.data.get('evento_id')
        participante_id = request.data.get('participante_id')
        forcar_regeneracao = request.data.get('forcar_regeneracao', False)
        enviar_email = request.data.get('enviar_email', True)
        
        if not evento_id or not participante_id:
            return Response(
                {'erro': 'evento_id e participante_id são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Agendar geração assíncrona
            task = gerar_certificado_individual.delay(
                evento_id, participante_id, forcar_regeneracao, enviar_email
            )
            
            logger.info(f"Certificado individual agendado - Evento: {evento_id}, Participante: {participante_id} - Task: {task.id}")
            
            return Response({
                'mensagem': 'Geração de certificado agendada com sucesso',
                'evento_id': evento_id,
                'participante_id': participante_id,
                'task_id': task.id
            })
            
        except Exception as e:
            logger.error(f"Erro ao agendar geração de certificado individual: {e}")
            return Response(
                {'erro': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def reenviar_email(self, request, pk=None):
        """Reenviar certificado por email"""
        
        certificado = self.get_object()
        email_alternativo = request.data.get('email')
        
        try:
            # Agendar reenvio
            task = enviar_certificado_email.delay(certificado.id, email_alternativo)
            
            logger.info(f"Reenvio de certificado agendado: {certificado.codigo_validacao} - Task: {task.id}")
            
            return Response({
                'mensagem': 'Reenvio de certificado agendado com sucesso',
                'codigo': certificado.codigo_validacao,
                'task_id': task.id
            })
            
        except Exception as e:
            logger.error(f"Erro ao agendar reenvio de certificado: {e}")
            return Response(
                {'erro': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download do arquivo PDF do certificado"""
        
        certificado = self.get_object()
        
        if certificado.status != 'gerado' or not certificado.arquivo_pdf:
            return Response(
                {'erro': 'Certificado não disponível para download'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Retornar arquivo PDF
            response = HttpResponse(
                certificado.arquivo_pdf,
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="certificado_{certificado.codigo_validacao}.pdf"'
            
            logger.info(f"Download de certificado: {certificado.codigo_validacao}")
            
            return response
            
        except Exception as e:
            logger.error(f"Erro no download do certificado: {e}")
            return Response(
                {'erro': 'Erro ao processar download'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def validar(self, request):
        """Validar certificado por código"""
        
        codigo = request.query_params.get('codigo')
        
        if not codigo:
            return Response(
                {'erro': 'Código de validação é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            certificado = Certificado.objects.filter(
                codigo_validacao=codigo,
                status='gerado'
            ).first()
            
            if not certificado:
                return Response(
                    {'valido': False, 'mensagem': 'Certificado não encontrado ou inválido'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Incrementar contador de visualizações
            certificado.visualizacoes += 1
            certificado.ultima_visualizacao = timezone.now()
            certificado.save()
            
            logger.info(f"Certificado validado: {codigo}")
            
            return Response({
                'valido': True,
                'certificado': {
                    'codigo': certificado.codigo_validacao,
                    'participante_nome': certificado.participante_nome,
                    'evento_nome': certificado.evento_nome,
                    'data_geracao': certificado.created_at,
                    'visualizacoes': certificado.visualizacoes
                }
            })
            
        except Exception as e:
            logger.error(f"Erro na validação do certificado: {e}")
            return Response(
                {'erro': 'Erro ao validar certificado'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        """Estatísticas dos certificados"""
        
        try:
            stats = {
                'total': Certificado.objects.count(),
                'gerados': Certificado.objects.filter(status='gerado').count(),
                'pendentes': Certificado.objects.filter(status='pendente').count(),
                'erro': Certificado.objects.filter(status='erro').count(),
                'enviados': Certificado.objects.filter(enviado=True).count(),
                'nao_enviados': Certificado.objects.filter(enviado=False).count(),
            }
            
            return Response(stats)
            
        except Exception as e:
            logger.error(f"Erro ao buscar estatísticas: {e}")
            return Response(
                {'erro': 'Erro ao buscar estatísticas'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EventoProcessadoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para gerenciar eventos processados"""
    
    queryset = EventoProcessado.objects.all()
    serializer_class = EventoProcessadoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return super().get_queryset().order_by('-processado_em')
    
    @action(detail=False, methods=['post'])
    def verificar_novos_eventos(self, request):
        """Verificar e processar novos eventos terminados"""
        
        try:
            # Agendar verificação assíncrona
            task = verificar_eventos_terminados.delay()
            
            logger.info(f"Verificação de eventos terminados agendada - Task: {task.id}")
            
            return Response({
                'mensagem': 'Verificação de eventos terminados agendada',
                'task_id': task.id
            })
            
        except Exception as e:
            logger.error(f"Erro ao agendar verificação de eventos: {e}")
            return Response(
                {'erro': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def reprocessar(self, request, pk=None):
        """Reprocessar certificados de um evento"""
        
        evento_processado = self.get_object()
        forcar_regeneracao = request.data.get('forcar_regeneracao', True)
        enviar_email = request.data.get('enviar_email', False)
        
        try:
            # Agendar reprocessamento
            task = gerar_certificados_evento.delay(
                evento_processado.evento_id, forcar_regeneracao, enviar_email
            )
            
            logger.info(f"Reprocessamento agendado para evento {evento_processado.evento_id} - Task: {task.id}")
            
            return Response({
                'mensagem': 'Reprocessamento agendado com sucesso',
                'evento_id': evento_processado.evento_id,
                'task_id': task.id
            })
            
        except Exception as e:
            logger.error(f"Erro ao agendar reprocessamento: {e}")
            return Response(
                {'erro': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        """Estatísticas dos eventos processados"""
        
        try:
            total_eventos = EventoProcessado.objects.count()
            total_certificados = sum(
                evento.certificados_gerados for evento in EventoProcessado.objects.all()
            )
            
            stats = {
                'eventos_processados': total_eventos,
                'certificados_gerados': total_certificados,
                'media_certificados_por_evento': total_certificados / total_eventos if total_eventos > 0 else 0
            }
            
            return Response(stats)
            
        except Exception as e:
            logger.error(f"Erro ao buscar estatísticas de eventos: {e}")
            return Response(
                {'erro': 'Erro ao buscar estatísticas'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )