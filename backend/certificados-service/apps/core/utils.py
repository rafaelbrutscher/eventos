import os
import hashlib
import uuid
from datetime import datetime
from typing import Dict, Any
from django.conf import settings
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
import logging

logger = logging.getLogger(__name__)


def gerar_codigo_validacao(evento_id: int, participante_id: int) -> str:
    """Gera código único para validação do certificado"""
    timestamp = datetime.now().isoformat()
    raw_string = f"{evento_id}-{participante_id}-{timestamp}-{uuid.uuid4()}"
    return hashlib.sha256(raw_string.encode()).hexdigest()[:16].upper()


def validar_codigo_certificado(codigo: str) -> bool:
    """Valida formato do código de certificado"""
    return len(codigo) == 16 and codigo.isalnum() and codigo.isupper()


def criar_nome_arquivo_pdf(evento_nome: str, participante_nome: str, codigo: str) -> str:
    """Cria nome do arquivo PDF do certificado"""
    evento_clean = "".join(c for c in evento_nome if c.isalnum() or c in (' ', '-', '_')).rstrip()
    participante_clean = "".join(c for c in participante_nome if c.isalnum() or c in (' ', '-', '_')).rstrip()
    
    evento_clean = evento_clean.replace(' ', '_')[:30]
    participante_clean = participante_clean.replace(' ', '_')[:30]
    
    return f"certificado_{evento_clean}_{participante_clean}_{codigo}.pdf"


def preparar_contexto_template(evento: Dict[str, Any], participante: Dict[str, Any], codigo: str) -> Dict[str, Any]:
    """Prepara contexto para renderização do template"""
    from datetime import datetime
    
    # Formatar datas
    data_inicio = datetime.fromisoformat(evento['data_inicio'].replace('Z', '+00:00'))
    data_fim = datetime.fromisoformat(evento['data_fim'].replace('Z', '+00:00'))
    
    return {
        'evento': {
            'nome': evento['nome'],
            'descricao': evento.get('descricao', ''),
            'local': evento.get('local', ''),
            'data_inicio': data_inicio.strftime('%d/%m/%Y'),
            'data_fim': data_fim.strftime('%d/%m/%Y'),
            'data_inicio_completa': data_inicio.strftime('%d de %B de %Y'),
            'data_fim_completa': data_fim.strftime('%d de %B de %Y'),
            'organizador': evento.get('organizador', 'Portal de Eventos'),
        },
        'participante': {
            'nome': participante['nome'],
            'email': participante['email'],
            'cpf': participante.get('cpf', ''),
        },
        'certificado': {
            'codigo': codigo,
            'data_emissao': datetime.now().strftime('%d/%m/%Y'),
            'url_validacao': f"{settings.ALLOWED_HOSTS[0]}/api/certificados/validar/{codigo}/"
        },
        'sistema': {
            'nome': 'Portal de Eventos',
            'url': f"http://{settings.ALLOWED_HOSTS[0]}",
        }
    }


def criar_diretorio_certificados():
    """Cria diretório para armazenar certificados se não existir"""
    cert_dir = os.path.join(settings.MEDIA_ROOT, 'certificados')
    os.makedirs(cert_dir, exist_ok=True)
    return cert_dir


def obter_caminho_media_certificado(nome_arquivo: str) -> str:
    """Retorna caminho relativo do certificado no diretório media"""
    return os.path.join('certificados', nome_arquivo)


def formatar_data_brasileira(data_iso: str) -> str:
    """Converte data ISO para formato brasileiro"""
    try:
        dt = datetime.fromisoformat(data_iso.replace('Z', '+00:00'))
        return dt.strftime('%d/%m/%Y')
    except Exception:
        return data_iso


def formatar_data_extenso(data_iso: str) -> str:
    """Converte data ISO para formato extenso em português"""
    try:
        dt = datetime.fromisoformat(data_iso.replace('Z', '+00:00'))
        meses = [
            '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ]
        return f"{dt.day} de {meses[dt.month]} de {dt.year}"
    except Exception:
        return data_iso


def calcular_duracao_evento(data_inicio: str, data_fim: str) -> str:
    """Calcula duração do evento em horas"""
    try:
        inicio = datetime.fromisoformat(data_inicio.replace('Z', '+00:00'))
        fim = datetime.fromisoformat(data_fim.replace('Z', '+00:00'))
        duracao = fim - inicio
        
        horas = int(duracao.total_seconds() / 3600)
        if horas < 1:
            return "1 hora"
        elif horas == 1:
            return "1 hora"
        else:
            return f"{horas} horas"
    except Exception:
        return "N/A"


def validar_template_html(template_content: str) -> bool:
    """Valida se o template HTML possui as variáveis necessárias"""
    required_vars = [
        '{{ participante.nome }}',
        '{{ evento.nome }}',
        '{{ certificado.codigo }}'
    ]
    
    for var in required_vars:
        if var not in template_content:
            logger.warning(f"Template não contém variável obrigatória: {var}")
            return False
    
    return True


def sanitizar_nome_arquivo(nome: str) -> str:
    """Remove caracteres inválidos do nome do arquivo"""
    chars_invalidos = '<>:"/\\|?*'
    for char in chars_invalidos:
        nome = nome.replace(char, '_')
    return nome.strip()[:100]  # Limitar tamanho