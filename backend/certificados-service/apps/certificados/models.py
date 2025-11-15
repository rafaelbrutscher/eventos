from django.db import models
from django.core.files.storage import default_storage
import os


class Certificado(models.Model):
    """Model para armazenar informações dos certificados gerados"""
    
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('gerando', 'Gerando'),
        ('gerado', 'Gerado'),
        ('enviado', 'Enviado'),
        ('erro', 'Erro'),
    ]
    
    # Identificadores
    evento_id = models.IntegerField(
        verbose_name='ID do Evento',
        help_text='ID do evento no eventos-service'
    )
    participante_id = models.IntegerField(
        verbose_name='ID do Participante',
        help_text='ID do participante no inscricoes-service'
    )
    
    # Dados do certificado
    codigo_validacao = models.CharField(
        max_length=16,
        unique=True,
        verbose_name='Código de Validação',
        help_text='Código único para validação do certificado'
    )
    
    # Arquivo PDF
    arquivo_pdf = models.FileField(
        upload_to='certificados/',
        null=True,
        blank=True,
        verbose_name='Arquivo PDF'
    )
    
    # Status e controle
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pendente',
        verbose_name='Status'
    )
    
    # Dados de geração
    data_geracao = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Data de Geração'
    )
    
    # Dados de envio
    enviado = models.BooleanField(
        default=False,
        verbose_name='Enviado por E-mail'
    )
    data_envio = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Data de Envio'
    )
    email_destinatario = models.EmailField(
        null=True,
        blank=True,
        verbose_name='E-mail do Destinatário'
    )
    
    # Tentativas de envio
    tentativas_envio = models.IntegerField(
        default=0,
        verbose_name='Tentativas de Envio'
    )
    ultima_tentativa_envio = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Última Tentativa de Envio'
    )
    
    # Logs e erros
    log_erro = models.TextField(
        null=True,
        blank=True,
        verbose_name='Log de Erro'
    )
    
    # Dados do evento (cache)
    evento_nome = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='Nome do Evento'
    )
    participante_nome = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='Nome do Participante'
    )
    participante_email = models.EmailField(
        null=True,
        blank=True,
        verbose_name='E-mail do Participante'
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Criado em'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Atualizado em'
    )
    
    class Meta:
        verbose_name = 'Certificado'
        verbose_name_plural = 'Certificados'
        unique_together = ['evento_id', 'participante_id']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['evento_id']),
            models.Index(fields=['participante_id']),
            models.Index(fields=['codigo_validacao']),
            models.Index(fields=['status']),
            models.Index(fields=['enviado']),
        ]
    
    def __str__(self):
        return f"Certificado {self.codigo_validacao} - {self.participante_nome or f'Participante {self.participante_id}'}"
    
    @property
    def url_pdf(self):
        """Retorna URL do PDF se disponível"""
        if self.arquivo_pdf:
            return self.arquivo_pdf.url
        return None
    
    @property
    def nome_arquivo(self):
        """Retorna nome do arquivo PDF"""
        if self.arquivo_pdf:
            return os.path.basename(self.arquivo_pdf.name)
        return None
    
    @property
    def tamanho_arquivo(self):
        """Retorna tamanho do arquivo em bytes"""
        if self.arquivo_pdf and default_storage.exists(self.arquivo_pdf.name):
            return default_storage.size(self.arquivo_pdf.name)
        return 0
    
    @property
    def pode_reenviar(self):
        """Verifica se pode tentar reenviar o certificado"""
        return self.status == 'gerado' and self.tentativas_envio < 5
    
    @property
    def url_validacao(self):
        """Retorna URL para validação do certificado"""
        from django.conf import settings
        base_url = f"http://{settings.ALLOWED_HOSTS[0]}" if settings.ALLOWED_HOSTS else "http://localhost:8005"
        return f"{base_url}/api/certificados/validar/{self.codigo_validacao}/"
    
    def marcar_como_gerado(self):
        """Marca certificado como gerado com sucesso"""
        from django.utils import timezone
        self.status = 'gerado'
        self.data_geracao = timezone.now()
        self.save(update_fields=['status', 'data_geracao', 'updated_at'])
    
    def marcar_como_enviado(self, email_destinatario: str):
        """Marca certificado como enviado"""
        from django.utils import timezone
        self.status = 'enviado'
        self.enviado = True
        self.data_envio = timezone.now()
        self.email_destinatario = email_destinatario
        self.save(update_fields=['status', 'enviado', 'data_envio', 'email_destinatario', 'updated_at'])
    
    def marcar_erro(self, erro: str):
        """Marca certificado com erro"""
        from django.utils import timezone
        self.status = 'erro'
        self.log_erro = erro
        self.ultima_tentativa_envio = timezone.now()
        self.save(update_fields=['status', 'log_erro', 'ultima_tentativa_envio', 'updated_at'])
    
    def incrementar_tentativa_envio(self):
        """Incrementa contador de tentativas de envio"""
        from django.utils import timezone
        self.tentativas_envio += 1
        self.ultima_tentativa_envio = timezone.now()
        self.save(update_fields=['tentativas_envio', 'ultima_tentativa_envio', 'updated_at'])


class EventoProcessado(models.Model):
    """Model para controlar quais eventos já tiveram certificados processados"""
    
    evento_id = models.IntegerField(
        unique=True,
        verbose_name='ID do Evento'
    )
    evento_nome = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='Nome do Evento'
    )
    data_processamento = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data de Processamento'
    )
    total_certificados = models.IntegerField(
        default=0,
        verbose_name='Total de Certificados'
    )
    certificados_gerados = models.IntegerField(
        default=0,
        verbose_name='Certificados Gerados'
    )
    certificados_enviados = models.IntegerField(
        default=0,
        verbose_name='Certificados Enviados'
    )
    processamento_completo = models.BooleanField(
        default=False,
        verbose_name='Processamento Completo'
    )
    
    class Meta:
        verbose_name = 'Evento Processado'
        verbose_name_plural = 'Eventos Processados'
        ordering = ['-data_processamento']
    
    def __str__(self):
        return f"Evento {self.evento_id} - {self.evento_nome or 'Nome não disponível'}"
    
    def atualizar_contadores(self):
        """Atualiza contadores baseado nos certificados"""
        certificados = Certificado.objects.filter(evento_id=self.evento_id)
        
        self.total_certificados = certificados.count()
        self.certificados_gerados = certificados.filter(status='gerado').count()
        self.certificados_enviados = certificados.filter(enviado=True).count()
        
        # Marca como completo se todos foram enviados
        self.processamento_completo = (
            self.total_certificados > 0 and 
            self.certificados_enviados == self.total_certificados
        )
        
        self.save(update_fields=[
            'total_certificados', 
            'certificados_gerados', 
            'certificados_enviados', 
            'processamento_completo'
        ])