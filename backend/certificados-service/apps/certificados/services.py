import os
import logging
from io import BytesIO
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from django.conf import settings
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from django.utils import timezone
try:
    from weasyprint import HTML, CSS
except (ImportError, OSError):
    # Mock para desenvolvimento quando WeasyPrint não está disponível
    class MockHTML:
        def __init__(self, *args, **kwargs):
            pass
        def write_pdf(self, *args, **kwargs):
            return b'Mock PDF content'
    
    class MockCSS:
        def __init__(self, *args, **kwargs):
            pass
    
    HTML = MockHTML
    CSS = MockCSS
from jinja2 import Template

from .models import Certificado, EventoProcessado
from apps.core.clients import eventos_client, inscricoes_client, presenca_client
from apps.core.utils import (
    gerar_codigo_validacao,
    criar_nome_arquivo_pdf,
    preparar_contexto_template,
    criar_diretorio_certificados,
    validar_template_html
)

logger = logging.getLogger(__name__)


class CertificadoService:
    """Serviço principal para geração e gerenciamento de certificados"""
    
    def __init__(self):
        self.template_default = 'certificado_default.html'
    
    def verificar_eventos_terminados(self) -> List[int]:
        """Verifica eventos que terminaram e ainda não foram processados"""
        eventos_terminados = eventos_client.get_eventos_terminados()
        eventos_nao_processados = []
        
        for evento in eventos_terminados:
            evento_id = evento['id']
            
            # Verificar se já foi processado
            if not EventoProcessado.objects.filter(evento_id=evento_id).exists():
                eventos_nao_processados.append(evento_id)
                logger.info(f"Evento {evento_id} ({evento.get('nome', 'N/A')}) terminado e precisa ser processado")
        
        return eventos_nao_processados
    
    def gerar_certificados_evento(self, evento_id: int, forcar_regeneracao: bool = False, 
                                enviar_email: bool = True) -> Dict[str, Any]:
        """Gera certificados para todos os participantes com presença confirmada de um evento"""
        
        logger.info(f"Iniciando geração de certificados para evento {evento_id}")
        
        try:
            # 1. Buscar dados do evento
            evento = eventos_client.get_evento_detalhes(evento_id)
            if not evento:
                raise Exception(f"Evento {evento_id} não encontrado")
            
            # 2. Verificar se evento terminou
            data_fim = datetime.fromisoformat(evento['data_fim'].replace('Z', '+00:00'))
            if data_fim > timezone.now():
                raise Exception(f"Evento {evento_id} ainda não terminou")
            
            # 3. Buscar participantes com presença confirmada
            participantes_presentes = presenca_client.get_participantes_presentes(evento_id)
            if not participantes_presentes:
                logger.warning(f"Nenhum participante com presença confirmada no evento {evento_id}")
                return {
                    'sucesso': True,
                    'mensagem': 'Nenhum participante com presença confirmada',
                    'certificados_gerados': 0,
                    'certificados_ja_existentes': 0
                }
            
            # 4. Registrar evento como processado
            evento_processado, created = EventoProcessado.objects.get_or_create(
                evento_id=evento_id,
                defaults={
                    'evento_nome': evento['nome'],
                    'total_certificados': len(participantes_presentes)
                }
            )
            
            if not created and not forcar_regeneracao:
                logger.info(f"Evento {evento_id} já foi processado anteriormente")
            
            # 5. Gerar certificados
            resultados = {
                'sucesso': True,
                'evento_id': evento_id,
                'certificados_gerados': 0,
                'certificados_ja_existentes': 0,
                'certificados_erro': 0,
                'erros': []
            }
            
            for participante_info in participantes_presentes:
                try:
                    participante_id = participante_info.get('participante_id') or participante_info.get('usuario_id')
                    if not participante_id:
                        logger.error(f"ID do participante não encontrado: {participante_info}")
                        continue
                    
                    # Buscar dados detalhados do participante
                    participante = inscricoes_client.get_participante_detalhes(participante_id)
                    if not participante:
                        logger.error(f"Dados do participante {participante_id} não encontrados")
                        continue
                    
                    # Verificar se certificado já existe
                    certificado_existente = Certificado.objects.filter(
                        evento_id=evento_id,
                        participante_id=participante_id
                    ).first()
                    
                    if certificado_existente and not forcar_regeneracao:
                        resultados['certificados_ja_existentes'] += 1
                        logger.info(f"Certificado já existe para participante {participante_id}")
                        continue
                    
                    # Gerar certificado
                    sucesso = self._gerar_certificado_individual(
                        evento, participante, certificado_existente, enviar_email
                    )
                    
                    if sucesso:
                        resultados['certificados_gerados'] += 1
                    else:
                        resultados['certificados_erro'] += 1
                        
                except Exception as e:
                    logger.error(f"Erro ao gerar certificado para participante: {e}")
                    resultados['certificados_erro'] += 1
                    resultados['erros'].append(str(e))
            
            # 6. Atualizar contadores do evento processado
            evento_processado.atualizar_contadores()
            
            resultados['mensagem'] = (
                f"Processamento concluído: {resultados['certificados_gerados']} gerados, "
                f"{resultados['certificados_ja_existentes']} já existentes, "
                f"{resultados['certificados_erro']} erros"
            )
            
            logger.info(f"Geração de certificados para evento {evento_id} concluída: {resultados['mensagem']}")
            return resultados
            
        except Exception as e:
            logger.error(f"Erro na geração de certificados para evento {evento_id}: {e}")
            return {
                'sucesso': False,
                'erro': str(e),
                'certificados_gerados': 0,
                'certificados_ja_existentes': 0,
                'certificados_erro': 0
            }
    
    def _gerar_certificado_individual(self, evento: Dict, participante: Dict, 
                                    certificado_existente: Optional[Certificado] = None,
                                    enviar_email: bool = True) -> bool:
        """Gera certificado individual para um participante"""
        
        participante_id = participante['id']
        evento_id = evento['id']
        
        try:
            # 1. Criar ou atualizar registro do certificado
            if certificado_existente:
                certificado = certificado_existente
                certificado.status = 'gerando'
                certificado.save()
            else:
                codigo = gerar_codigo_validacao(evento_id, participante_id)
                certificado = Certificado.objects.create(
                    evento_id=evento_id,
                    participante_id=participante_id,
                    codigo_validacao=codigo,
                    status='gerando',
                    evento_nome=evento['nome'],
                    participante_nome=participante['nome'],
                    participante_email=participante['email']
                )
            
            # 2. Preparar contexto para template
            contexto = preparar_contexto_template(evento, participante, certificado.codigo_validacao)
            
            # 3. Obter template HTML
            template_html = self._obter_template_html(evento_id)
            
            # 4. Renderizar HTML com dados
            html_renderizado = self._renderizar_template(template_html, contexto)
            
            # 5. Gerar PDF
            pdf_content = self._gerar_pdf_from_html(html_renderizado)
            
            # 6. Salvar arquivo PDF
            nome_arquivo = criar_nome_arquivo_pdf(
                evento['nome'], 
                participante['nome'], 
                certificado.codigo_validacao
            )
            
            # Criar diretório se não existir
            criar_diretorio_certificados()
            
            # Salvar arquivo
            certificado.arquivo_pdf.save(
                nome_arquivo,
                ContentFile(pdf_content),
                save=False
            )
            
            # 7. Marcar como gerado
            certificado.marcar_como_gerado()
            
            # 8. Enviar por email se solicitado
            if enviar_email:
                try:
                    self._enviar_certificado_email(certificado)
                except Exception as e:
                    logger.error(f"Erro ao enviar certificado por email: {e}")
                    # Não falha a geração se o email falhar
            
            logger.info(f"Certificado gerado com sucesso: {certificado.codigo_validacao}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao gerar certificado individual: {e}")
            if 'certificado' in locals():
                certificado.marcar_erro(str(e))
            return False
    
    def _obter_template_html(self, evento_id: int) -> str:
        """Obtém template HTML para o certificado"""
        
        # Tentar buscar template específico do evento
        template_evento = eventos_client.get_template_certificado(evento_id)
        
        if template_evento and validar_template_html(template_evento):
            logger.info(f"Usando template específico do evento {evento_id}")
            return template_evento
        
        # Usar template padrão
        try:
            template_path = os.path.join(settings.BASE_DIR, 'templates', self.template_default)
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            logger.info(f"Usando template padrão: {self.template_default}")
            return template_content
            
        except Exception as e:
            logger.error(f"Erro ao ler template padrão: {e}")
            # Template básico de fallback
            return self._get_template_fallback()
    
    def _renderizar_template(self, template_html: str, contexto: Dict) -> str:
        """Renderiza template HTML com os dados do contexto"""
        try:
            template = Template(template_html)
            return template.render(**contexto)
        except Exception as e:
            logger.error(f"Erro ao renderizar template: {e}")
            raise
    
    def _gerar_pdf_from_html(self, html_content: str) -> bytes:
        """Converte HTML em PDF usando WeasyPrint"""
        try:
            # CSS básico para o certificado
            css_content = '''
                @page {
                    size: A4 landscape;
                    margin: 1cm;
                }
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 2cm;
                }
                .certificado-container {
                    border: 3px solid #2c3e50;
                    padding: 3cm;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .titulo {
                    font-size: 2.5em;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 1em;
                }
                .subtitulo {
                    font-size: 1.2em;
                    margin-bottom: 2em;
                }
                .nome-participante {
                    font-size: 2em;
                    font-weight: bold;
                    color: #e74c3c;
                    margin: 1em 0;
                }
                .evento-info {
                    font-size: 1.1em;
                    margin: 1em 0;
                }
                .codigo-validacao {
                    font-size: 0.8em;
                    color: #7f8c8d;
                    margin-top: 2em;
                }
            '''
            
            html_obj = HTML(string=html_content)
            css_obj = CSS(string=css_content)
            
            pdf_buffer = BytesIO()
            html_obj.write_pdf(pdf_buffer, stylesheets=[css_obj])
            
            return pdf_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Erro ao gerar PDF: {e}")
            raise
    
    def _enviar_certificado_email(self, certificado: Certificado):
        """Envia certificado por email"""
        from django.core.mail import EmailMessage
        
        try:
            email_destinatario = certificado.participante_email
            if not email_destinatario:
                raise Exception("Email do participante não disponível")
            
            # Preparar email
            subject = f"Certificado do evento: {certificado.evento_nome}"
            message = f"""
            Olá {certificado.participante_nome},

            Parabéns! Seu certificado de participação no evento "{certificado.evento_nome}" está pronto.

            Código de validação: {certificado.codigo_validacao}
            
            Você pode validar seu certificado através do link: {certificado.url_validacao}

            Atenciosamente,
            Portal de Eventos
            """
            
            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email_destinatario]
            )
            
            # Anexar PDF
            if certificado.arquivo_pdf:
                email.attach_file(certificado.arquivo_pdf.path)
            
            # Enviar
            email.send()
            
            # Marcar como enviado
            certificado.marcar_como_enviado(email_destinatario)
            
            logger.info(f"Certificado {certificado.codigo_validacao} enviado para {email_destinatario}")
            
        except Exception as e:
            logger.error(f"Erro ao enviar certificado por email: {e}")
            certificado.incrementar_tentativa_envio()
            raise
    
    def validar_certificado(self, codigo: str) -> Dict[str, Any]:
        """Valida um certificado pelo código"""
        try:
            certificado = Certificado.objects.get(codigo_validacao=codigo.upper())
            
            return {
                'valido': True,
                'codigo': certificado.codigo_validacao,
                'participante_nome': certificado.participante_nome,
                'evento_nome': certificado.evento_nome,
                'data_geracao': certificado.data_geracao,
                'url_pdf': certificado.url_pdf,
            }
            
        except Certificado.DoesNotExist:
            return {
                'valido': False,
                'codigo': codigo,
                'mensagem': 'Certificado não encontrado ou código inválido'
            }
        except Exception as e:
            logger.error(f"Erro ao validar certificado {codigo}: {e}")
            return {
                'valido': False,
                'codigo': codigo,
                'mensagem': 'Erro interno na validação'
            }
    
    def reenviar_certificado(self, certificado_id: int, email_alternativo: Optional[str] = None) -> bool:
        """Reenvia certificado por email"""
        try:
            certificado = Certificado.objects.get(id=certificado_id)
            
            if not certificado.pode_reenviar:
                raise Exception("Certificado não pode ser reenviado (limite de tentativas ou status inválido)")
            
            # Usar email alternativo se fornecido
            if email_alternativo:
                certificado.participante_email = email_alternativo
                certificado.save()
            
            self._enviar_certificado_email(certificado)
            return True
            
        except Exception as e:
            logger.error(f"Erro ao reenviar certificado {certificado_id}: {e}")
            return False
    
    def _get_template_fallback(self) -> str:
        """Template HTML básico de fallback"""
        return '''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Certificado</title>
        </head>
        <body>
            <div class="certificado-container">
                <h1 class="titulo">CERTIFICADO</h1>
                <p class="subtitulo">Certificamos que</p>
                <h2 class="nome-participante">{{ participante.nome }}</h2>
                <p class="evento-info">
                    participou do evento <strong>{{ evento.nome }}</strong><br>
                    realizado em {{ evento.data_inicio_completa }}
                    {% if evento.data_inicio != evento.data_fim %}
                        a {{ evento.data_fim_completa }}
                    {% endif %}
                </p>
                <p class="codigo-validacao">
                    Código de validação: {{ certificado.codigo }}<br>
                    Emitido em: {{ certificado.data_emissao }}
                </p>
            </div>
        </body>
        </html>
        '''


# Instância do serviço
certificado_service = CertificadoService()