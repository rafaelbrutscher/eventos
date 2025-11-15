from rest_framework import serializers
from .models import Certificado, EventoProcessado


class CertificadoSerializer(serializers.ModelSerializer):
    """Serializer para o model Certificado"""
    
    url_pdf = serializers.ReadOnlyField()
    nome_arquivo = serializers.ReadOnlyField()
    tamanho_arquivo = serializers.ReadOnlyField()
    url_validacao = serializers.ReadOnlyField()
    pode_reenviar = serializers.ReadOnlyField()
    
    class Meta:
        model = Certificado
        fields = [
            'id',
            'evento_id',
            'participante_id',
            'codigo_validacao',
            'status',
            'data_geracao',
            'enviado',
            'data_envio',
            'email_destinatario',
            'tentativas_envio',
            'evento_nome',
            'participante_nome',
            'participante_email',
            'url_pdf',
            'nome_arquivo',
            'tamanho_arquivo',
            'url_validacao',
            'pode_reenviar',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'codigo_validacao',
            'data_geracao',
            'data_envio',
            'tentativas_envio',
            'created_at',
            'updated_at',
        ]


class CertificadoValidacaoSerializer(serializers.Serializer):
    """Serializer para validação de certificado"""
    
    valido = serializers.BooleanField()
    codigo = serializers.CharField()
    participante_nome = serializers.CharField(required=False)
    evento_nome = serializers.CharField(required=False)
    data_geracao = serializers.DateTimeField(required=False)
    url_pdf = serializers.URLField(required=False)
    mensagem = serializers.CharField(required=False)


class EventoProcessadoSerializer(serializers.ModelSerializer):
    """Serializer para o model EventoProcessado"""
    
    progresso_geracao = serializers.SerializerMethodField()
    progresso_envio = serializers.SerializerMethodField()
    
    class Meta:
        model = EventoProcessado
        fields = [
            'id',
            'evento_id',
            'evento_nome',
            'data_processamento',
            'total_certificados',
            'certificados_gerados',
            'certificados_enviados',
            'processamento_completo',
            'progresso_geracao',
            'progresso_envio',
        ]
    
    def get_progresso_geracao(self, obj):
        """Calcula progresso de geração em percentual"""
        if obj.total_certificados == 0:
            return 0
        return round((obj.certificados_gerados / obj.total_certificados) * 100, 1)
    
    def get_progresso_envio(self, obj):
        """Calcula progresso de envio em percentual"""
        if obj.total_certificados == 0:
            return 0
        return round((obj.certificados_enviados / obj.total_certificados) * 100, 1)


class StatusCertificadosEventoSerializer(serializers.Serializer):
    """Serializer para status de certificados de um evento"""
    
    evento_id = serializers.IntegerField()
    evento_nome = serializers.CharField(required=False)
    total_participantes = serializers.IntegerField()
    total_presencas = serializers.IntegerField()
    certificados_pendentes = serializers.IntegerField()
    certificados_gerando = serializers.IntegerField()
    certificados_gerados = serializers.IntegerField()
    certificados_enviados = serializers.IntegerField()
    certificados_erro = serializers.IntegerField()
    processamento_completo = serializers.BooleanField()
    progresso_total = serializers.FloatField()
    ultima_atualizacao = serializers.DateTimeField()


class GerarCertificadosRequestSerializer(serializers.Serializer):
    """Serializer para request de geração de certificados"""
    
    forcar_regeneracao = serializers.BooleanField(
        default=False,
        help_text="Se True, regerará certificados já existentes"
    )
    enviar_email = serializers.BooleanField(
        default=True,
        help_text="Se True, enviará certificados por email automaticamente"
    )
    apenas_validar = serializers.BooleanField(
        default=False,
        help_text="Se True, apenas valida se é possível gerar sem efetivamente gerar"
    )


class GerarCertificadosResponseSerializer(serializers.Serializer):
    """Serializer para response de geração de certificados"""
    
    sucesso = serializers.BooleanField()
    mensagem = serializers.CharField()
    evento_id = serializers.IntegerField()
    total_participantes = serializers.IntegerField()
    certificados_para_gerar = serializers.IntegerField()
    certificados_ja_existentes = serializers.IntegerField()
    task_id = serializers.CharField(required=False)
    estimativa_conclusao = serializers.CharField(required=False)


class ReenviarCertificadoSerializer(serializers.Serializer):
    """Serializer para reenvio de certificado"""
    
    email_destinatario = serializers.EmailField(
        required=False,
        help_text="Email alternativo para envio (opcional)"
    )


class EstatisticasCertificadosSerializer(serializers.Serializer):
    """Serializer para estatísticas gerais de certificados"""
    
    total_certificados = serializers.IntegerField()
    certificados_gerados_hoje = serializers.IntegerField()
    certificados_enviados_hoje = serializers.IntegerField()
    eventos_processados = serializers.IntegerField()
    eventos_pendentes = serializers.IntegerField()
    taxa_sucesso_envio = serializers.FloatField()
    tempo_medio_geracao = serializers.FloatField()
    certificados_por_status = serializers.DictField()
    ultimos_certificados = CertificadoSerializer(many=True)