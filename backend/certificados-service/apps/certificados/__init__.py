from django.apps import AppConfig


class CertificadosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.certificados'
    verbose_name = 'Certificados'
    
    def ready(self):
        # Importar signals se houver
        pass