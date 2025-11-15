import requests
import logging
from django.conf import settings
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class MicroserviceClient:
    """Cliente base para comunicação com outros microserviços"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Faz requisição HTTP com tratamento de erros"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            
            # Tentar decodificar JSON
            try:
                return response.json()
            except ValueError:
                return {'content': response.text}
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro na requisição {method} {url}: {e}")
            raise
    
    def get(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        return self._make_request('GET', endpoint, **kwargs)
    
    def post(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        return self._make_request('POST', endpoint, **kwargs)


class EventosServiceClient(MicroserviceClient):
    """Cliente para comunicação com o Eventos Service"""
    
    def __init__(self):
        super().__init__(settings.MICROSERVICES_URLS['eventos'])
    
    def get_evento_detalhes(self, evento_id: int) -> Optional[Dict[str, Any]]:
        """Busca detalhes de um evento"""
        try:
            response = self.get(f'/api/eventos/{evento_id}')
            return response.get('data')
        except Exception as e:
            logger.error(f"Erro ao buscar evento {evento_id}: {e}")
            return None
    
    def get_eventos_terminados(self) -> List[Dict[str, Any]]:
        """Busca eventos que já terminaram"""
        try:
            response = self.get('/api/eventos', params={'status': 'terminado'})
            return response.get('data', [])
        except Exception as e:
            logger.error(f"Erro ao buscar eventos terminados: {e}")
            return []
    
    def get_template_certificado(self, evento_id: int) -> Optional[str]:
        """Busca template de certificado do evento"""
        try:
            evento = self.get_evento_detalhes(evento_id)
            if evento:
                return evento.get('template_certificado')
            return None
        except Exception as e:
            logger.error(f"Erro ao buscar template do evento {evento_id}: {e}")
            return None


class InscricoesServiceClient(MicroserviceClient):
    """Cliente para comunicação com o Inscrições Service"""
    
    def __init__(self):
        super().__init__(settings.MICROSERVICES_URLS['inscricoes'])
    
    def get_participantes_evento(self, evento_id: int) -> List[Dict[str, Any]]:
        """Busca participantes inscritos em um evento"""
        try:
            response = self.get(f'/api/inscricoes/evento/{evento_id}')
            return response.get('data', [])
        except Exception as e:
            logger.error(f"Erro ao buscar participantes do evento {evento_id}: {e}")
            return []
    
    def get_participante_detalhes(self, participante_id: int) -> Optional[Dict[str, Any]]:
        """Busca detalhes de um participante"""
        try:
            response = self.get(f'/api/participantes/{participante_id}')
            return response.get('data')
        except Exception as e:
            logger.error(f"Erro ao buscar participante {participante_id}: {e}")
            return None


class PresencaServiceClient(MicroserviceClient):
    """Cliente para comunicação com o Presença Service"""
    
    def __init__(self):
        super().__init__(settings.MICROSERVICES_URLS['presenca'])
    
    def get_participantes_presentes(self, evento_id: int) -> List[Dict[str, Any]]:
        """Busca participantes com presença confirmada em um evento"""
        try:
            response = self.get(f'/api/eventos/{evento_id}/presencas')
            return response.get('data', [])
        except Exception as e:
            logger.error(f"Erro ao buscar presenças do evento {evento_id}: {e}")
            return []
    
    def verificar_presenca_participante(self, evento_id: int, participante_id: int) -> bool:
        """Verifica se um participante teve presença confirmada"""
        try:
            response = self.get(f'/api/presencas/{participante_id}')
            if response.get('success'):
                presenca = response.get('data')
                return presenca and presenca.get('evento_id') == evento_id
            return False
        except Exception as e:
            logger.error(f"Erro ao verificar presença do participante {participante_id}: {e}")
            return False


# Instâncias dos clientes
eventos_client = EventosServiceClient()
inscricoes_client = InscricoesServiceClient()
presenca_client = PresencaServiceClient()