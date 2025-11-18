from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import requests
import logging
from apps.certificados.models import Certificado

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Gera certificados automaticamente para eventos finalizados'

    def add_arguments(self, parser):
        parser.add_argument(
            '--evento-id',
            type=int,
            help='ID específico do evento para gerar certificados',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simular execução sem gerar certificados',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🎓 Iniciando geração automática de certificados...')
        )

        try:
            if options['evento_id']:
                # Gerar para evento específico
                self.processar_evento(options['evento_id'], options['dry_run'])
            else:
                # Buscar eventos finalizados
                eventos_finalizados = self.buscar_eventos_finalizados()
                
                if not eventos_finalizados:
                    self.stdout.write('ℹ️  Nenhum evento finalizado encontrado.')
                    return

                for evento in eventos_finalizados:
                    self.processar_evento(evento['id'], options['dry_run'])

        except Exception as e:
            logger.error(f'Erro na geração automática de certificados: {str(e)}')
            self.stdout.write(
                self.style.ERROR(f'❌ Erro: {str(e)}')
            )

    def buscar_eventos_finalizados(self):
        """Busca eventos que já finalizaram"""
        try:
            # Buscar eventos do microserviço de eventos
            eventos_url = 'http://127.0.0.1:8001/api/eventos'
            response = requests.get(eventos_url)
            
            if response.status_code != 200:
                raise Exception(f'Erro ao buscar eventos: {response.status_code}')
            
            eventos = response.json()['data']
            eventos_finalizados = []
            
            agora = timezone.now()
            
            for evento in eventos:
                # Verificar se o evento já acabou (data_fim passou)
                if evento.get('data_fim'):
                    try:
                        data_fim_str = evento['data_fim']
                        # Parse da data considerando diferentes formatos
                        if 'T' in data_fim_str:
                            data_fim = datetime.fromisoformat(data_fim_str.replace('Z', '+00:00'))
                        else:
                            data_fim = datetime.strptime(data_fim_str, '%Y-%m-%d')
                            data_fim = timezone.make_aware(data_fim)
                        
                        if data_fim < agora:
                            eventos_finalizados.append(evento)
                    except Exception as e:
                        logger.warning(f'Erro ao parsear data do evento {evento.get("id")}: {str(e)}')
                        continue
            
            return eventos_finalizados
            
        except Exception as e:
            logger.error(f'Erro ao buscar eventos finalizados: {str(e)}')
            return []

    def processar_evento(self, evento_id, dry_run=False):
        """Processa um evento específico para geração de certificados"""
        try:
            self.stdout.write(f'📋 Processando evento {evento_id}...')
            
            # Buscar participantes que confirmaram presença
            presenca_url = f'http://127.0.0.1:8003/api/eventos/{evento_id}/presencas'
            response = requests.get(presenca_url)
            
            if response.status_code != 200:
                self.stdout.write(
                    self.style.WARNING(f'⚠️  Não foi possível buscar presenças do evento {evento_id}')
                )
                return
            
            presencas = response.json()['data']
            participantes_confirmados = [p for p in presencas if p['status'] == 'confirmado']
            
            if not participantes_confirmados:
                self.stdout.write(f'ℹ️  Nenhum participante confirmado no evento {evento_id}')
                return
            
            certificados_gerados = 0
            
            for presenca in participantes_confirmados:
                participante_id = presenca['usuario_id']
                
                # Verificar se certificado já existe
                if Certificado.objects.filter(
                    evento_id=evento_id, 
                    participante_id=participante_id
                ).exists():
                    continue
                
                if dry_run:
                    self.stdout.write(f'  🔍 [DRY-RUN] Criaria certificado para participante {participante_id}')
                    certificados_gerados += 1
                else:
                    # Buscar dados do participante
                    user_response = requests.get(f'http://127.0.0.1:8000/api/usuarios/{participante_id}')
                    evento_response = requests.get(f'http://127.0.0.1:8001/api/eventos/{evento_id}')
                    
                    if user_response.status_code == 200 and evento_response.status_code == 200:
                        user_data = user_response.json()['data']
                        evento_data = evento_response.json()['data']
                        
                        # Criar certificado
                        certificado = Certificado.objects.create(
                            evento_id=evento_id,
                            participante_id=participante_id,
                            participante_nome=user_data['name'],
                            participante_email=user_data['email'],
                            evento_nome=evento_data['nome'],
                            gerado=True
                        )
                        
                        self.stdout.write(f'  ✅ Certificado gerado: {certificado.codigo_validacao}')
                        certificados_gerados += 1
                        
                        # Enviar por email
                        try:
                            from apps.certificados.views import enviar_certificado_por_email
                            enviar_certificado_por_email(certificado)
                            self.stdout.write(f'  📧 Email enviado para {user_data["email"]}')
                        except Exception as e:
                            logger.warning(f'Falha ao enviar email do certificado {certificado.id}: {str(e)}')
            
            self.stdout.write(
                self.style.SUCCESS(f'🎉 Evento {evento_id}: {certificados_gerados} certificados processados')
            )
            
        except Exception as e:
            logger.error(f'Erro ao processar evento {evento_id}: {str(e)}')
            self.stdout.write(
                self.style.ERROR(f'❌ Erro no evento {evento_id}: {str(e)}')
            )