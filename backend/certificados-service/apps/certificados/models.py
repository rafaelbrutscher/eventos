from django.db import models
import uuid


def generate_validation_code():
    """Gera código de validação único sem hífens"""
    return str(uuid.uuid4()).replace('-', '')


class Certificado(models.Model):
    """Model simplificado para certificados"""
    
    # Identificadores - apenas IDs necessários
    evento_id = models.IntegerField(verbose_name='ID do Evento')
    participante_id = models.IntegerField(verbose_name='ID do Participante')
    
    # Código único de validação - usando função para gerar string curta
    codigo_validacao = models.CharField(
        max_length=64,
        unique=True,
        default=generate_validation_code,
        verbose_name='Código de Validação'
    )
    
    # Cache dos dados (atualizados dinamicamente)
    participante_nome = models.CharField(max_length=255, verbose_name='Nome do Participante', help_text='Cache do nome - será atualizado automaticamente')
    participante_email = models.EmailField(verbose_name='E-mail do Participante', help_text='Cache do email - será atualizado automaticamente')  
    evento_nome = models.CharField(max_length=255, verbose_name='Nome do Evento', help_text='Cache do nome - será atualizado automaticamente')
    
    # Arquivo PDF
    arquivo_pdf = models.TextField(null=True, blank=True, verbose_name='Caminho do PDF')
    
    # Template base para o certificado
    template_html = models.TextField(null=True, blank=True, verbose_name='Template HTML do Certificado')
    
    # Status simples
    gerado = models.BooleanField(default=False, verbose_name='Certificado Gerado')
    disponivel_usuario = models.BooleanField(default=True, verbose_name='Disponível para Usuário')
    
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
    
    def get_participante_atual(self):
        """Busca dados atuais do participante via API"""
        import requests
        try:
            response = requests.get(f'http://127.0.0.1:8001/api/usuarios/{self.participante_id}')
            if response.status_code == 200:
                data = response.json()['data']
                return {
                    'nome': data['name'],
                    'email': data['email']
                }
        except:
            pass
        return {
            'nome': self.participante_nome,
            'email': self.participante_email
        }
    
    def get_evento_atual(self):
        """Busca dados atuais do evento via API"""
        import requests
        try:
            response = requests.get(f'http://127.0.0.1:8002/api/eventos/{self.evento_id}')
            if response.status_code == 200:
                data = response.json()['data']
                return {
                    'nome': data['nome']
                }
        except:
            pass
        return {
            'nome': self.evento_nome
        }
    
    def atualizar_cache(self):
        """Atualiza os dados em cache com informações atuais"""
        participante = self.get_participante_atual()
        evento = self.get_evento_atual()
        
        self.participante_nome = participante['nome']
        self.participante_email = participante['email']
        self.evento_nome = evento['nome']
        self.save()

    def __str__(self):
        return f"Certificado {self.participante_nome} - {self.evento_nome}"