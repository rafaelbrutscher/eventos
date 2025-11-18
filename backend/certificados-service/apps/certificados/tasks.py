from celery import shared_task
from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)


@shared_task
def gerar_certificados_automaticamente():
    """Task Celery para gerar certificados automaticamente"""
    try:
        logger.info('Iniciando geração automática de certificados via Celery')
        call_command('gerar_certificados')
        logger.info('Geração automática de certificados concluída')
        return 'Certificados gerados com sucesso'
    except Exception as e:
        logger.error(f'Erro na geração automática de certificados: {str(e)}')
        raise


@shared_task  
def verificar_eventos_finalizados():
    """Task periódica para verificar eventos finalizados"""
    return gerar_certificados_automaticamente.delay()