from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CertificadoViewSet, EventoProcessadoViewSet

router = DefaultRouter()
router.register(r'certificados', CertificadoViewSet)
router.register(r'eventos-processados', EventoProcessadoViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]