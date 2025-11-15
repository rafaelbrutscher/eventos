from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

from .services import certificado_service
from .models import Certificado, EventoProcessado

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def verificar_eventos_terminados(self):
    """Tarefa periódica para verificar eventos que terminaram e gerar certificados"""
    
    logger.info("Iniciando verificação de eventos terminados")
    
    try:
        # Buscar eventos que terminaram e ainda não foram processados
        eventos_nao_processados = certificado_service.verificar_eventos_terminados()
        
        if not eventos_nao_processados:
            logger.info("Nenhum evento novo para processar")
            return {
                'status': 'success',
                'mensagem': 'Nenhum evento novo para processar',
                'eventos_processados': 0
            }
        
        resultados = []
        
        # Processar cada evento
        for evento_id in eventos_nao_processados:
            try:
                logger.info(f"Processando evento {evento_id}")
                
                # Gerar certificados do evento de forma assíncrona
                gerar_certificados_evento.delay(evento_id, forcar_regeneracao=False, enviar_email=True)
                
                resultados.append({
                    'evento_id': evento_id,
                    'status': 'agendado'
                })
                
            except Exception as e:
                logger.error(f"Erro ao agendar processamento do evento {evento_id}: {e}")
                resultados.append({
                    'evento_id': evento_id,
                    'status': 'erro',
                    'erro': str(e)
                })
        
        logger.info(f"Verificação concluída. {len(eventos_nao_processados)} eventos agendados para processamento")
        
        return {
            'status': 'success',
            'mensagem': f'{len(eventos_nao_processados)} eventos agendados para processamento',
            'eventos_processados': len(eventos_nao_processados),
            'resultados': resultados
        }
        
    except Exception as e:
        logger.error(f"Erro na verificação de eventos terminados: {e}")
        
        # Retry com backoff exponencial
        raise self.retry(
            countdown=60 * (2 ** self.request.retries),
            exc=e
        )


@shared_task(bind=True, max_retries=5)
def gerar_certificados_evento(self, evento_id, forcar_regeneracao=False, enviar_email=True):
    """Tarefa para gerar certificados de um evento específico"""
    
    logger.info(f"Iniciando geração de certificados para evento {evento_id}")
    
    try:
        # Marcar evento como em processamento
        evento_processado, created = EventoProcessado.objects.get_or_create(
            evento_id=evento_id,
            defaults={'evento_nome': f'Evento {evento_id}'}
        )
        
        # Gerar certificados
        resultado = certificado_service.gerar_certificados_evento(
            evento_id=evento_id,
            forcar_regeneracao=forcar_regeneracao,
            enviar_email=enviar_email
        )
        
        if resultado['sucesso']:
            logger.info(f"Certificados gerados com sucesso para evento {evento_id}: {resultado['mensagem']}")
            
            # Atualizar contadores
            evento_processado.atualizar_contadores()
            
            return {
                'status': 'success',
                'evento_id': evento_id,
                'certificados_gerados': resultado['certificados_gerados'],
                'certificados_ja_existentes': resultado['certificados_ja_existentes'],
                'certificados_erro': resultado.get('certificados_erro', 0),
                'mensagem': resultado['mensagem']
            }
        else:
            raise Exception(resultado.get('erro', 'Erro desconhecido na geração'))
            
    except Exception as e:
        logger.error(f"Erro na geração de certificados para evento {evento_id}: {e}")
        
        # Retry com backoff exponencial, mas apenas para erros recuperáveis
        if 'não encontrado' not in str(e).lower() and 'ainda não terminou' not in str(e).lower():
            raise self.retry(
                countdown=300 * (2 ** self.request.retries),  # 5min, 10min, 20min...
                exc=e,
                max_retries=3
            )
        else:
            # Erros não recuperáveis
            logger.error(f"Erro não recuperável para evento {evento_id}: {e}")
            return {
                'status': 'error',
                'evento_id': evento_id,
                'erro': str(e)
            }


@shared_task(bind=True, max_retries=3)
def enviar_certificado_email(self, certificado_id, email_alternativo=None):
    """Tarefa para enviar certificado por email"""
    
    logger.info(f"Enviando certificado {certificado_id} por email")
    
    try:
        certificado = Certificado.objects.get(id=certificado_id)
        
        # Usar email alternativo se fornecido
        if email_alternativo:
            certificado.participante_email = email_alternativo
            certificado.save()
        
        # Enviar certificado
        sucesso = certificado_service._enviar_certificado_email(certificado)
        
        if sucesso:
            logger.info(f"Certificado {certificado_id} enviado com sucesso")
            return {
                'status': 'success',
                'certificado_id': certificado_id,
                'email': certificado.participante_email
            }
        else:
            raise Exception("Falha no envio do certificado")
            
    except Certificado.DoesNotExist:
        logger.error(f"Certificado {certificado_id} não encontrado")
        return {
            'status': 'error',
            'certificado_id': certificado_id,
            'erro': 'Certificado não encontrado'
        }
        
    except Exception as e:
        logger.error(f"Erro ao enviar certificado {certificado_id}: {e}")
        
        # Incrementar tentativas no certificado
        try:
            certificado = Certificado.objects.get(id=certificado_id)
            certificado.incrementar_tentativa_envio()
        except:
            pass
        
        # Retry com backoff
        raise self.retry(
            countdown=300 * (2 ** self.request.retries),
            exc=e
        )


@shared_task(bind=True)
def reprocessar_certificados_falharam(self):
    """Tarefa periódica para reprocessar certificados que falharam"""
    
    logger.info("Iniciando reprocessamento de certificados que falharam")
    
    try:
        # Buscar certificados com erro que podem ser reprocessados
        certificados_erro = Certificado.objects.filter(
            status='erro',
            tentativas_envio__lt=5,
            ultima_tentativa_envio__lt=timezone.now() - timedelta(hours=1)
        )[:50]  # Limitar para não sobrecarregar
        
        if not certificados_erro:
            logger.info("Nenhum certificado para reprocessar")
            return {
                'status': 'success',
                'mensagem': 'Nenhum certificado para reprocessar',
                'certificados_reprocessados': 0
            }
        
        resultados = []
        
        for certificado in certificados_erro:
            try:
                # Reagendar envio
                enviar_certificado_email.delay(certificado.id)
                
                resultados.append({
                    'certificado_id': certificado.id,
                    'codigo': certificado.codigo_validacao,
                    'status': 'reagendado'
                })
                
                logger.info(f"Certificado {certificado.codigo_validacao} reagendado para envio")
                
            except Exception as e:
                logger.error(f"Erro ao reagendar certificado {certificado.id}: {e}")
                resultados.append({
                    'certificado_id': certificado.id,
                    'codigo': certificado.codigo_validacao,
                    'status': 'erro',
                    'erro': str(e)
                })
        
        logger.info(f"Reprocessamento concluído. {len(resultados)} certificados processados")
        
        return {
            'status': 'success',
            'mensagem': f'{len(resultados)} certificados reprocessados',
            'certificados_reprocessados': len(resultados),
            'resultados': resultados
        }
        
    except Exception as e:
        logger.error(f"Erro no reprocessamento de certificados: {e}")
        return {
            'status': 'error',
            'erro': str(e)
        }


@shared_task(bind=True, max_retries=2)
def gerar_certificado_individual(self, evento_id, participante_id, forcar_regeneracao=False, enviar_email=True):
    """Tarefa para gerar certificado individual"""
    
    logger.info(f"Gerando certificado individual - Evento: {evento_id}, Participante: {participante_id}")
    
    try:
        from apps.core.clients import eventos_client, inscricoes_client
        
        # Buscar dados do evento
        evento = eventos_client.get_evento_detalhes(evento_id)
        if not evento:
            raise Exception(f"Evento {evento_id} não encontrado")
        
        # Buscar dados do participante
        participante = inscricoes_client.get_participante_detalhes(participante_id)
        if not participante:
            raise Exception(f"Participante {participante_id} não encontrado")
        
        # Verificar se certificado já existe
        certificado_existente = None
        if not forcar_regeneracao:
            certificado_existente = Certificado.objects.filter(
                evento_id=evento_id,
                participante_id=participante_id
            ).first()
            
            if certificado_existente and certificado_existente.status == 'gerado':
                logger.info(f"Certificado já existe e foi gerado: {certificado_existente.codigo_validacao}")
                return {
                    'status': 'exists',
                    'certificado_id': certificado_existente.id,
                    'codigo': certificado_existente.codigo_validacao
                }
        
        # Gerar certificado
        sucesso = certificado_service._gerar_certificado_individual(
            evento, participante, certificado_existente, enviar_email
        )
        
        if sucesso:
            certificado = Certificado.objects.get(
                evento_id=evento_id,
                participante_id=participante_id
            )
            
            logger.info(f"Certificado individual gerado com sucesso: {certificado.codigo_validacao}")
            
            return {
                'status': 'success',
                'certificado_id': certificado.id,
                'codigo': certificado.codigo_validacao,
                'enviado_email': enviar_email and certificado.enviado
            }
        else:
            raise Exception("Falha na geração do certificado")
            
    except Exception as e:
        logger.error(f"Erro na geração de certificado individual: {e}")
        
        # Retry apenas para erros temporários
        if 'não encontrado' not in str(e).lower():
            raise self.retry(
                countdown=60 * (2 ** self.request.retries),
                exc=e
            )
        else:
            return {
                'status': 'error',
                'erro': str(e)
            }


@shared_task
def limpar_certificados_antigos():
    """Tarefa para limpar certificados muito antigos (opcional)"""
    
    logger.info("Iniciando limpeza de certificados antigos")
    
    try:
        # Buscar certificados com mais de 2 anos
        data_limite = timezone.now() - timedelta(days=730)
        
        certificados_antigos = Certificado.objects.filter(
            created_at__lt=data_limite,
            status__in=['erro', 'pendente']  # Apenas os não gerados
        )
        
        total_removidos = certificados_antigos.count()
        
        if total_removidos > 0:
            certificados_antigos.delete()
            logger.info(f"Removidos {total_removidos} certificados antigos")
        else:
            logger.info("Nenhum certificado antigo para remover")
        
        return {
            'status': 'success',
            'certificados_removidos': total_removidos
        }
        
    except Exception as e:
        logger.error(f"Erro na limpeza de certificados antigos: {e}")
        return {
            'status': 'error',
            'erro': str(e)
        }


@shared_task
def atualizar_estatisticas_eventos():
    """Tarefa para atualizar estatísticas dos eventos processados"""
    
    logger.info("Atualizando estatísticas de eventos processados")
    
    try:
        eventos_processados = EventoProcessado.objects.all()
        total_atualizados = 0
        
        for evento in eventos_processados:
            evento.atualizar_contadores()
            total_atualizados += 1
        
        logger.info(f"Estatísticas atualizadas para {total_atualizados} eventos")
        
        return {
            'status': 'success',
            'eventos_atualizados': total_atualizados
        }
        
    except Exception as e:
        logger.error(f"Erro ao atualizar estatísticas: {e}")
        return {
            'status': 'error',
            'erro': str(e)
        }