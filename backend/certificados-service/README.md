# Certificados Service - Microserviço para Geração e Gerenciamento de Certificados

## Descrição
Microserviço responsável por gerar, armazenar e enviar certificados para participantes que tiveram presença confirmada em eventos.

## Tecnologias
- Python 3.11+
- Django 5.0+
- Django REST Framework
- Celery (para tarefas assíncronas)
- Redis (broker do Celery)
- WeasyPrint (geração de PDF)
- PostgreSQL (banco de dados)

## Funcionalidades

### 1. Geração Automática de Certificados
- Detecta quando eventos terminam
- Busca participantes com presença confirmada
- Gera certificados em PDF usando templates HTML
- Evita duplicação de certificados

### 2. Envio por E-mail
- Envia certificados automaticamente por e-mail
- Sistema de retry em caso de falhas
- Logs de envio

### 3. APIs para Consulta
- Consulta de certificados por participante
- Status de certificados por evento
- Geração manual de certificados

### 4. Validação de Certificados
- Códigos únicos de validação
- Endpoint público para validação

## Estrutura do Projeto
```
certificados-service/
├── requirements.txt
├── manage.py
├── certificados_service/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── celery.py
├── apps/
│   ├── __init__.py
│   ├── certificados/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── tasks.py
│   │   └── services.py
│   └── core/
│       ├── __init__.py
│       ├── clients.py
│       └── utils.py
├── templates/
│   └── certificado_default.html
└── media/
    └── certificados/
```

## Instalação

1. Criar ambiente virtual:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

2. Instalar dependências:
```bash
pip install -r requirements.txt
```

3. Configurar banco de dados:
```bash
python manage.py migrate
```

4. Iniciar servidor:
```bash
python manage.py runserver 0.0.0.0:8005
```

5. Iniciar Celery (em terminal separado):
```bash
celery -A certificados_service worker -l info
```

## Configuração

### Variáveis de Ambiente
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/certificados_db

# Redis
REDIS_URL=redis://localhost:6379/0

# Microservices URLs
EVENTOS_SERVICE_URL=http://127.0.0.1:8002
INSCRICOES_SERVICE_URL=http://127.0.0.1:8003
PRESENCA_SERVICE_URL=http://127.0.0.1:8004

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True

# Media
MEDIA_ROOT=/path/to/media/
MEDIA_URL=/media/

# Debug
DEBUG=True
```

## APIs

### Endpoints Principais

#### GET /api/certificados/participante/{participante_id}/
Retorna certificados de um participante

#### GET /api/certificados/evento/{evento_id}/status/
Status de certificados de um evento

#### POST /api/certificados/evento/{evento_id}/gerar/
Gera certificados manualmente para um evento

#### GET /api/certificados/validar/{codigo}/
Valida um certificado pelo código

## Integração com Outros Serviços

### Eventos Service (Porta 8002)
- Busca detalhes do evento
- Obtém template de certificado

### Inscrições Service (Porta 8003)
- Lista de participantes inscritos

### Presença Service (Porta 8004)
- Confirmação de presença dos participantes

## Monitoramento

- Logs detalhados de geração e envio
- Métricas de certificados gerados
- Status de tarefas Celery

## Desenvolvimento

### Executar Testes
```bash
python manage.py test
```

### Criar Migrações
```bash
python manage.py makemigrations
python manage.py migrate
```