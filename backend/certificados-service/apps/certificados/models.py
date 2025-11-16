from django.db import models
import uuid


class Certificado(models.Model):
    """Model simplificado para certificados"""
    
    # Identificadores
    evento_id = models.IntegerField(verbose_name='ID do Evento')
    participante_id = models.IntegerField(verbose_name='ID do Participante')
    
    # Código único de validação
    codigo_validacao = models.CharField(
        max_length=32,
        unique=True,
        default=uuid.uuid4,
        verbose_name='Código de Validação'
    )
    
    # Dados essenciais
    participante_nome = models.CharField(max_length=255, verbose_name='Nome do Participante')
    participante_email = models.EmailField(verbose_name='E-mail do Participante')
    evento_nome = models.CharField(max_length=255, verbose_name='Nome do Evento')
    
    # Arquivo PDF
    arquivo_pdf = models.TextField(null=True, blank=True, verbose_name='Caminho do PDF')
    
    # Status simples
    gerado = models.BooleanField(default=False, verbose_name='Certificado Gerado')
    enviado = models.BooleanField(default=False, verbose_name='Enviado por E-mail')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    
    class Meta:
        db_table = 'certificados'
        verbose_name = 'Certificado'
        verbose_name_plural = 'Certificados'
        unique_together = ['evento_id', 'participante_id']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['evento_id']),
            models.Index(fields=['participante_id']),
            models.Index(fields=['codigo_validacao']),
        ]
    
    def __str__(self):
        return f"Certificado {self.participante_nome} - {self.evento_nome}"