# 🎉 Sistema de Gestão de Eventos

Sistema completo para gerenciamento de eventos utilizando arquitetura de microserviços com Laravel, React e Python/Django.

## 🏗️ Arquitetura

Sistema distribuído em 5 microserviços independentes + frontend React:

```
📦 Sistema de Eventos
┣ 🔐 auth-service      (Laravel)    - Porta 8001
┣ 📅 eventos-service   (Laravel)    - Porta 8002  
┣ 📝 inscricoes-service (Laravel)   - Porta 8003
┣ ✅ presenca-service  (Laravel)    - Porta 8004
┣ 🎓 certificados-service (Django) - Porta 8005
┗ 🌐 frontend         (React)      - Porta 5173
```

## 🚀 Funcionalidades Principais

### 🔐 **auth-service** - Autenticação e Autorização
- **Porta**: 8001
- **Tecnologia**: Laravel 12.0 + JWT
- **Responsabilidades**:
  - Autenticação de usuários
  - Autorização baseada em roles (participante/atendente/admin)
  - Gerenciamento de tokens JWT
  - CRUD de usuários

### 📅 **eventos-service** - Gestão de Eventos
- **Porta**: 8002
- **Tecnologia**: Laravel 12.0
- **Responsabilidades**:
  - CRUD de eventos
  - Controle de status (rascunho/ativo/encerrado)
  - Gerenciamento de datas e horários
  - Configurações de eventos

### 📝 **inscricoes-service** - Gerenciamento de Inscrições
- **Porta**: 8003
- **Tecnologia**: Laravel 12.0
- **Responsabilidades**:
  - Inscrições de participantes em eventos
  - Controle de vagas
  - Status de inscrições
  - Relatórios de participantes

### ✅ **presenca-service** - Controle de Presença
- **Porta**: 8004
- **Tecnologia**: Laravel 12.0
- **Responsabilidades**:
  - Check-in/check-out de participantes
  - **Sistema offline-first** com sincronização automática
  - **Controle de acesso baseado em roles** (apenas atendentes/admins)
  - Relatórios de presença

### 🎓 **certificados-service** - Geração de Certificados
- **Porta**: 8005
- **Tecnologia**: Python 3.11 + Django 5.0 + Celery
- **Responsabilidades**:
  - **Geração automática** de certificados ao fim dos eventos
  - **Templates HTML** personalizáveis
  - **Envio automático por email** com PDF anexo
  - **Sistema de validação** por código único
  - **Processamento assíncrono** com Celery + Redis

### 🌐 **Frontend** - Interface do Usuário
- **Porta**: 5173
- **Tecnologia**: React 18 + TypeScript + Vite
- **Responsabilidades**:
  - Interface unificada para todos os serviços
  - **Funcionalidade offline** para check-in
  - **Dashboard responsivo**
  - **Autenticação JWT** integrada

## 🔌 APIs e Endpoints

### 🔐 Auth Service (8001)
```http
POST   /api/auth/login           # Login de usuário
POST   /api/auth/register        # Registro de usuário
POST   /api/auth/logout          # Logout
GET    /api/auth/me              # Dados do usuário logado
PUT    /api/auth/profile         # Atualizar perfil
GET    /api/users                # Listar usuários (admin)
POST   /api/users                # Criar usuário (admin)
PUT    /api/users/{id}           # Atualizar usuário (admin)
DELETE /api/users/{id}           # Deletar usuário (admin)
```

### 📅 Eventos Service (8002)
```http
GET    /api/eventos              # Listar eventos
POST   /api/eventos              # Criar evento
GET    /api/eventos/{id}         # Detalhes do evento
PUT    /api/eventos/{id}         # Atualizar evento
DELETE /api/eventos/{id}         # Deletar evento
PATCH  /api/eventos/{id}/status  # Alterar status do evento
GET    /api/eventos/stats        # Estatísticas de eventos
```

### 📝 Inscrições Service (8003)
```http
GET    /api/inscricoes           # Listar inscrições
POST   /api/inscricoes           # Criar inscrição
GET    /api/inscricoes/{id}      # Detalhes da inscrição
PUT    /api/inscricoes/{id}      # Atualizar inscrição
DELETE /api/inscricoes/{id}      # Cancelar inscrição
GET    /api/inscricoes/evento/{id} # Inscrições por evento
GET    /api/inscricoes/stats     # Estatísticas de inscrições
```

### ✅ Presença Service (8004)
```http
GET    /api/presencas            # Listar presenças
POST   /api/presencas/checkin    # Fazer check-in (atendente/admin)
POST   /api/presencas/checkout   # Fazer check-out (atendente/admin)
GET    /api/presencas/evento/{id} # Presenças por evento
POST   /api/presencas/sync       # Sincronizar dados offline
GET    /api/presencas/stats      # Estatísticas de presença
GET    /api/presencas/offline    # Dados para modo offline
```

### 🎓 Certificados Service (8005)
```http
GET    /api/certificados/                    # Listar certificados
POST   /api/certificados/gerar_por_evento/  # Gerar certificados de evento
POST   /api/certificados/gerar_individual/  # Gerar certificado individual
GET    /api/certificados/validar/           # Validar certificado por código
GET    /api/certificados/{id}/download/     # Download PDF do certificado
POST   /api/certificados/{id}/reenviar_email/ # Reenviar certificado por email
GET    /api/certificados/estatisticas/      # Estatísticas de certificados
GET    /api/eventos-processados/            # Eventos processados
POST   /api/eventos-processados/verificar_novos_eventos/ # Verificar novos eventos
```

## 🛠️ Tecnologias Utilizadas

### Backend
- **Laravel 12.0** - Framework PHP para microserviços
- **Python 3.11 + Django 5.0** - Serviço de certificados
- **JWT** - Autenticação stateless
- **MySQL** - Banco de dados principal (Laravel services)
- **SQLite/PostgreSQL** - Banco de dados (certificados-service)
- **Celery + Redis** - Processamento assíncrono
- **WeasyPrint** - Geração de PDFs

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **Tailwind CSS** - Framework CSS
- **Service Workers** - Funcionalidade offline

### DevOps & Ferramentas
- **Composer** - Gerenciador de dependências PHP
- **npm/yarn** - Gerenciador de dependências JS
- **pip** - Gerenciador de dependências Python
- **Git** - Controle de versão

## 🚦 Como Executar

### Pré-requisitos
- PHP 8.2+
- Node.js 18+
- Python 3.11+
- MySQL
- Redis (para certificados)
- Composer
- Git

### 1. **Clone o repositório**
```bash
git clone https://github.com/rafaelbrutscher/eventos.git
cd eventos
```

### 2. **Backend - Laravel Services (8001-8004)**
```bash
# Para cada serviço Laravel (auth, eventos, inscricoes, presenca)
cd backend/{service-name}

# Instalar dependências
composer install

# Configurar ambiente
cp .env.example .env
php artisan key:generate

# Configurar banco de dados no .env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=service_db
DB_USERNAME=root
DB_PASSWORD=

# Executar migrações
php artisan migrate

# Executar seeders (opcional)
php artisan db:seed

# Iniciar servidor (cada serviço na sua porta)
php artisan serve --host=0.0.0.0 --port=800X
```

### 3. **Certificados Service - Django (8005)**
```bash
cd backend/certificados-service

# Criar ambiente virtual
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Instalar dependências
pip install -r requirements.txt

# Executar migrações
python manage.py migrate

# Criar superusuário (opcional)
python manage.py createsuperuser

# Iniciar Redis (necessário para Celery)
redis-server

# Iniciar Celery Worker (novo terminal)
celery -A certificados_service worker -l info

# Iniciar Celery Beat (novo terminal)
celery -A certificados_service beat -l info

# Iniciar servidor Django
python manage.py runserver 0.0.0.0:8005
```

### 4. **Frontend - React (5173)**
```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### 5. **Configuração de URLs**
Certifique-se de que as URLs dos microserviços estejam corretas:

**Frontend** (`src/services/api.ts`):
```typescript
const BASE_URLS = {
  auth: 'http://localhost:8001/api',
  eventos: 'http://localhost:8002/api', 
  inscricoes: 'http://localhost:8003/api',
  presenca: 'http://localhost:8004/api',
  certificados: 'http://localhost:8005/api'
};
```

**Certificados Service** (`settings.py`):
```python
MICROSERVICES_URLS = {
    'auth': 'http://localhost:8001',
    'eventos': 'http://localhost:8002',
    'inscricoes': 'http://localhost:8003', 
    'presenca': 'http://localhost:8004',
}
```

## 🎯 Funcionalidades Especiais

### 🔄 **Sistema Offline (Presença)**
- **Cache local** com localStorage
- **Sincronização automática** quando volta online
- **Interface visual** de status offline/online
- **Fila de operações** pendentes

### 🤖 **Processamento Automático (Certificados)**
- **Detecção automática** de eventos terminados
- **Geração em lote** de certificados
- **Envio automático** por email
- **Reprocessamento** de falhas
- **Tarefas periódicas** com Celery Beat

### 🛡️ **Controle de Acesso**
- **Roles**: participante, atendente, admin
- **Middleware JWT** em todos os serviços
- **Endpoints protegidos** por role
- **Interface adaptativa** por permissão

### 📧 **Sistema de Email**
- **Templates HTML** personalizáveis
- **PDFs anexos** automáticos
- **Tentativas de reenvio**
- **Logs detalhados**

## 📊 Monitoramento e Logs

### Logs por Serviço
- **Laravel**: `storage/logs/laravel.log`
- **Django**: `logs/certificados.log`
- **Frontend**: Browser DevTools

### Estatísticas
- Cada serviço possui endpoints `/stats` ou `/estatisticas`
- Dashboard no frontend com métricas
- Admin Django para certificados

## 🔧 Configuração de Produção

### Variáveis de Ambiente Importantes
```env
# Laravel Services
APP_ENV=production
JWT_SECRET=your-jwt-secret
DB_CONNECTION=mysql
MAIL_MAILER=smtp

# Django Service  
DEBUG=False
SECRET_KEY=your-secret-key
EMAIL_HOST_USER=your-email
EMAIL_HOST_PASSWORD=your-password
```

### Docker (Opcional)
```dockerfile
# Exemplo para cada serviço
FROM php:8.2-fpm  # Laravel
FROM python:3.11  # Django
FROM node:18      # React
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Equipe

- **Rafael Brutscher** - Desenvolvedor Principal

---

## 📋 Status dos Serviços

| Serviço | Status | Porta | Tecnologia | Funcionalidades |
|---------|--------|-------|------------|-----------------|
| 🔐 Auth | ✅ Funcionando | 8001 | Laravel + JWT | Login, Registro, Roles |
| 📅 Eventos | ✅ Funcionando | 8002 | Laravel | CRUD, Status, Stats |
| 📝 Inscrições | ✅ Funcionando | 8003 | Laravel | CRUD, Vagas, Relatórios |
| ✅ Presença | ✅ Funcionando | 8004 | Laravel | Check-in, Offline, Sync |
| 🎓 Certificados | ✅ Funcionando | 8005 | Django + Celery | PDF, Email, Auto |
| 🌐 Frontend | ✅ Funcionando | 5173 | React + TS | UI, Offline, Dashboard |

**Sistema 100% Operacional!** 🎉
