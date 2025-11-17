from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
import logging
import os

from .models import Certificado
from .serializers import CertificadoSerializer, CertificadoValidacaoSerializer

logger = logging.getLogger(__name__)


def enviar_certificado_por_email(certificado):
    """Envia o certificado por email para o participante"""
    try:
        # Renderizar template HTML
        html_content = render_to_string('emails/certificado_disponivel.html', {
            'certificado': certificado
        })
        
        # Criar email
        email = EmailMultiAlternatives(
            subject=f'Certificado Disponível - {certificado.evento_nome}',
            body=f'Seu certificado do evento "{certificado.evento_nome}" está disponível!',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[certificado.participante_email]
        )
        
        # Adicionar versão HTML
        email.attach_alternative(html_content, "text/html")
        
        # Anexar PDF se existir
        if certificado.arquivo_pdf and os.path.exists(certificado.arquivo_pdf.path):
            email.attach_file(certificado.arquivo_pdf.path)
        
        # Enviar
        email.send()
        
        # Marcar como enviado
        certificado.enviado = True
        certificado.save()
        
        logger.info(f'Certificado enviado por email para {certificado.participante_email}', extra={
            'certificado_id': certificado.id,
            'email': certificado.participante_email
        })
        
        return True
        
    except Exception as e:
        logger.error(f'Erro ao enviar certificado por email: {str(e)}', extra={
            'certificado_id': certificado.id,
            'email': certificado.participante_email,
            'error': str(e)
        })
        return False


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
    
    def create(self, request, *args, **kwargs):
        """Criar certificado e enviar por email"""
        response = super().create(request, *args, **kwargs)
        
        if response.status_code == 201:
            certificado = Certificado.objects.get(pk=response.data['id'])
            
            # Enviar por email em background (opcional)
            try:
                enviar_certificado_por_email(certificado)
            except Exception as e:
                logger.warning(f'Falha ao enviar certificado por email durante criação: {str(e)}')
        
        return response
    
    @action(detail=True, methods=['post'], url_path='enviar-email')
    def enviar_email(self, request, pk=None):
        """Enviar certificado por email manualmente"""
        try:
            certificado = self.get_object()
            
            if not certificado.participante_email:
                return Response(
                    {'erro': 'Email do participante não encontrado'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            sucesso = enviar_certificado_por_email(certificado)
            
            if sucesso:
                return Response({
                    'sucesso': True,
                    'mensagem': 'Certificado enviado por email com sucesso',
                    'email': certificado.participante_email
                })
            else:
                return Response(
                    {'erro': 'Falha ao enviar certificado por email'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f'Erro crítico ao enviar certificado por email: {str(e)}')
            return Response(
                {'erro': 'Erro interno do servidor'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )