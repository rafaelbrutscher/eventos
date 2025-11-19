from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CertificadoViewSet, listar_eventos_participados, listar_meus_certificados, gerar_certificado_usuario, download_certificado, validar_certificado_direto
from .gerar_certificado_api import gerar_certificado

router = DefaultRouter()
router.register(r'certificados', CertificadoViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    
    # APIs específicas para usuários
    path('api/meus-eventos/', listar_eventos_participados, name='meus-eventos'),
    path('api/meus-certificados/', listar_meus_certificados, name='meus-certificados'),
    path('api/gerar-certificado/', gerar_certificado_usuario, name='gerar-certificado-usuario'),
    path('api/certificados/<int:certificado_id>/download/', download_certificado, name='download-certificado'),
    
    # Rota direta para validação de certificados
    path('api/certificados/validar/<str:codigo>/', validar_certificado_direto, name='validar-certificado-direto'),
    
    # API automática para o presença-service
    path('api/gerar-certificado', gerar_certificado, name='gerar-certificado-automatico'),
]