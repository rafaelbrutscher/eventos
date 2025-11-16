from rest_framework import serializers
from .models import Certificado


class CertificadoSerializer(serializers.ModelSerializer):
    """Serializer simplificado para o model Certificado"""
    
    class Meta:
        model = Certificado
        fields = [
            'id',
            'evento_id',
            'participante_id',
            'codigo_validacao',
            'participante_nome',
            'participante_email',
            'evento_nome',
            'arquivo_pdf',
            'gerado',
            'enviado',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'codigo_validacao',
            'created_at',
            'updated_at',
        ]



class CertificadoValidacaoSerializer(serializers.Serializer):
    """Serializer para validação de certificado"""
    
    valido = serializers.BooleanField()
    codigo = serializers.CharField()
    participante_nome = serializers.CharField(required=False)
    evento_nome = serializers.CharField(required=False)
    mensagem = serializers.CharField(required=False)