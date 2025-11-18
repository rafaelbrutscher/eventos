from django.core.management.base import BaseCommand
from django.core.management import call_command
import time
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Monitora eventos continuamente e gera certificados automaticamente'

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=300,  # 5 minutos
            help='Intervalo em segundos entre verificações (padrão: 300)',
        )

    def handle(self, *args, **options):
        interval = options['interval']
        
        self.stdout.write(
            self.style.SUCCESS(f'🔄 Iniciando monitoramento contínuo de certificados...')
        )
        self.stdout.write(f'⏱️  Verificando a cada {interval} segundos')
        self.stdout.write('🛑 Pressione Ctrl+C para parar')

        try:
            while True:
                try:
                    self.stdout.write(f'🔍 Verificando eventos finalizados...')
                    
                    # Chama o comando de geração
                    call_command('gerar_certificados')
                    
                    self.stdout.write(f'✅ Verificação concluída. Próxima em {interval}s...')
                    
                except Exception as e:
                    logger.error(f'Erro durante verificação: {str(e)}')
                    self.stdout.write(
                        self.style.ERROR(f'❌ Erro: {str(e)}')
                    )
                
                # Aguardar intervalo
                time.sleep(interval)
                
        except KeyboardInterrupt:
            self.stdout.write(
                self.style.SUCCESS('\n🛑 Monitoramento interrompido pelo usuário.')
            )