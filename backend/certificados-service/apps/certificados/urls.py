from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CertificadoViewSet, listar_eventos_participados, gerar_certificado_usuario, download_certificado

router = DefaultRouter()
router.register(r'certificados', CertificadoViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    
    # APIs específicas para usuários
    path('api/meus-eventos/', listar_eventos_participados, name='meus-eventos'),
    path('api/gerar-certificado/', gerar_certificado_usuario, name='gerar-certificado'),
    path('api/certificados/<int:certificado_id>/download/', download_certificado, name='download-certificado'),
]