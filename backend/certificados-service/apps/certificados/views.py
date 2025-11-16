from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.http import Http404
from django.shortcuts import get_object_or_404
import logging

from .models import Certificado
from .serializers import CertificadoSerializer, CertificadoValidacaoSerializer

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