# 🎉 Sistema de Gestão de Eventos

Sistema completo de gestão de eventos com arquitetura de microserviços, desenvolvido em Laravel (backend) e React (frontend). Suporte completo para Docker.

## 🏗️ Arquitetura

### Microserviços
- **auth-service** (Porta 8001): Autenticação e autorização JWT
- **eventos-service** (Porta 8002): Gestão de eventos
- **inscricoes-service** (Porta 8003): Sistema de inscrições
- **presenca-service** (Porta 8004): Controle de presença com funcionalidade offline
- **certificados-service** (Porta 8005): Geração automática de certificados em Python/Django

### Frontend
- **React SPA** (Porta 3000): Interface do usuário com suporte offline
- **Gateway Nginx** (Porta 80): Proxy reverso para todos os serviços

## 🚀 Tecnologias

### Backend
- **Framework**: Laravel 12.0 (PHP 8.2) + Django 5.0 (Python 3.11)
- **Autenticação**: JWT (php-open-source-saver/jwt-auth)
- **Banco de Dados**: MySQL 8.0 + PostgreSQL 15
- **Cache/Filas**: Redis 7
- **Geração PDF**: WeasyPrint
- **Task Queue**: Celery

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Funcionalidade Offline**: Service Workers + localStorage

### Infraestrutura
- **Containerização**: Docker + Docker Compose
- **Proxy**: Nginx (Gateway)
- **Cache/Queue**: Redis

## 🐳 Instalação com Docker (Recomendado)

### 1. Pré-requisitos
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM mínimo

### 2. Clone e Execute
```bash
git clone [url-do-repositorio]
cd eventos

# Iniciar todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 3. Executar Migrações
```bash
# Laravel services (banco único MySQL)
docker-compose exec auth-service php artisan migrate
docker-compose exec eventos-service php artisan migrate  
docker-compose exec inscricoes-service php artisan migrate
docker-compose exec presenca-service php artisan migrate

# Django service (PostgreSQL separado)
docker-compose exec certificados-service python manage.py migrate
```

### 4. Acessar Sistema
- **Gateway Principal**: http://177.44.248.89
- **Frontend**: http://177.44.248.89:3000
- **Auth Service**: http://177.44.248.89:8001
- **Eventos Service**: http://177.44.248.89:8002
- **Inscrições Service**: http://177.44.248.89:8003
- **Presença Service**: http://177.44.248.89:8004
- **Certificados Service**: http://177.44.248.89:8005

## 💻 Instalação Local (Desenvolvimento)

### 1. Pré-requisitos
- PHP 8.2+
- Python 3.11+
- Node.js 18+
- Composer
- MySQL 8.0+
- PostgreSQL 15+
- Redis

### 2. Configure os Microserviços Laravel
```bash
# Para cada serviço em backend/
cd backend/[nome-do-servico]
composer install
cp .env.example .env
php artisan key:generate
php artisan jwt:secret
php artisan migrate
php artisan db:seed
```

### 3. Configure o Serviço de Certificados
```bash
cd backend/certificados-service
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
.\\venv\\Scripts\\activate  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic
```

### 4. Configure o Frontend
```bash
cd frontend
npm install
```

### 5. Inicie os Serviços
```bash
# Laravel Services
cd backend/auth-service && php artisan serve --port=8001 &
cd backend/eventos-service && php artisan serve --port=8002 &
cd backend/inscricoes-service && php artisan serve --port=8003 &
cd backend/presenca-service && php artisan serve --port=8004 &

# Django Service
cd backend/certificados-service && python manage.py runserver 177.44.248.89:8005 &

# Celery Worker
cd backend/certificados-service && celery -A certificados_service worker --loglevel=info &

# Frontend
cd frontend && npm run dev
```

## 🌐 API Endpoints

### Auth Service (8001)
- `POST /api/register` - Registrar usuário
- `POST /api/login` - Login
- `POST /api/logout` - Logout
- `GET /api/me` - Perfil do usuário
- `POST /api/refresh` - Renovar token

### Eventos Service (8002)
- `GET /api/eventos` - Listar eventos
- `POST /api/eventos` - Criar evento
- `GET /api/eventos/{id}` - Detalhes do evento
- `PUT /api/eventos/{id}` - Atualizar evento
- `DELETE /api/eventos/{id}` - Excluir evento

### Inscrições Service (8003)
- `GET /api/inscricoes` - Listar inscrições
- `POST /api/inscricoes` - Criar inscrição
- `GET /api/inscricoes/evento/{evento_id}` - Inscrições por evento
- `PUT /api/inscricoes/{id}` - Atualizar inscrição
- `DELETE /api/inscricoes/{id}` - Cancelar inscrição

### Presença Service (8004)
- `GET /api/presencas` - Listar presenças
- `POST /api/presencas/checkin` - Registrar presença (apenas atendente/admin)
- `GET /api/presencas/evento/{evento_id}` - Presenças por evento
- `POST /api/presencas/sync` - Sincronizar dados offline
- `GET /api/presencas/offline/{evento_id}` - Dados para modo offline

### Certificados Service (8005)
- `POST /api/certificados/gerar` - Gerar certificados do evento
- `GET /api/certificados/{codigo}` - Validar certificado
- `GET /api/certificados/download/{codigo}` - Download do PDF
- `POST /api/certificados/reenviar` - Reenviar por email

## 🎯 Funcionalidades Principais

### Sistema de Autenticação
- Registro e login de usuários
- Autenticação JWT com refresh tokens
- Controle de acesso por roles (participante/atendente/admin)
- Middleware de proteção

### Gestão de Eventos
- CRUD completo de eventos
- Upload de imagens
- Categorização e tags
- Controle de vagas e período de inscrições

### Sistema de Inscrições
- Inscrição online em eventos
- Controle automático de vagas
- Confirmação por email
- Status em tempo real

### Controle de Presença Offline-First
- **Check-in presencial** restrito a usuários com role atendente/admin
- **Funcionalidade offline completa** com sync automática
- **Armazenamento local** para situações sem internet
- **Sincronização bidirecional** quando conexão retorna
- **Interface de status** mostrando modo offline/online

### Geração Automática de Certificados
- **Processamento assíncrono** com Celery
- **Geração de PDFs** com WeasyPrint
- **Templates customizáveis** em HTML/CSS
- **Códigos de validação únicos**
- **Envio automático por email**
- **Sistema de validação online**

## 🐳 Comandos Docker Úteis

```bash
# Gerenciamento básico
docker-compose up -d          # Iniciar todos os serviços
docker-compose down           # Parar todos os serviços
docker-compose ps             # Status dos containers
docker-compose logs -f        # Logs em tempo real

# Logs específicos
docker-compose logs auth-service
docker-compose logs certificados-service

# Executar comandos nos containers
docker-compose exec auth-service php artisan migrate
docker-compose exec certificados-service python manage.py createsuperuser

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d --force-recreate

# Backup dos bancos
docker-compose exec mysql mysqldump -u eventos -peventos123 eventos > backup_mysql.sql
docker-compose exec postgres pg_dumpall -U certificados > backup_postgres.sql
```

## 🔧 Monitoramento e Logs

### Health Checks
Cada serviço possui endpoints de saúde:
- Auth: http://177.44.248.89:8001/up
- Eventos: http://177.44.248.89:8002/up
- Inscrições: http://177.44.248.89:8003/up
- Presença: http://177.44.248.89:8004/up
- Certificados: http://177.44.248.89:8005/health/

### Logs Docker
```bash
# Todos os logs
docker-compose logs -f

# Logs com timestamp
docker-compose logs -t

# Salvar logs em arquivo
docker-compose logs > sistema-logs.txt
```

## 🛡️ Segurança e Acesso

### Controle de Acesso por Roles
- **Participante**: Pode se inscrever em eventos e visualizar próprias inscrições
- **Atendente**: Pode fazer check-in de participantes + permissões de participante
- **Admin**: Acesso completo a todas as funcionalidades

### Middleware de Segurança
- **CheckAtendenteRole**: Restringe check-in a atendente/admin
- **JWT Authentication**: Protege todas as rotas da API
- **Request Validation**: Validação rigorosa de inputs
- **Rate Limiting**: Proteção contra ataques

### Funcionalidade Offline
- **Armazenamento seguro** em localStorage criptografado
- **Validação local** de permissões de role
- **Sync inteligente** que evita duplicação
- **Fallback automático** em caso de falha de conexão

## 📊 Estrutura do Banco de Dados

### MySQL (Todos os Serviços Laravel)
- **Database único**: `eventos`
- **Tabelas por serviço**:
  - `users` - Usuários e autenticação (auth-service)
  - `eventos` - Dados dos eventos (eventos-service)
  - `inscricoes` - Inscrições dos participantes (inscricoes-service)
  - `presencas` - Registros de check-in (presenca-service)

### PostgreSQL (Certificados)
- **Database**: `certificados`
- **Tabelas**:
  - `certificados` - Dados dos certificados gerados
  - `eventos_processados` - Log de eventos processados

## 🚀 Deploy em Produção

### VM Linux com Docker
```bash
# 1. Clone o projeto
git clone [url] && cd eventos

# 2. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com dados de produção

# 3. Inicie com Docker
docker-compose up -d

# 4. Execute migrações
docker-compose exec auth-service php artisan migrate --force
docker-compose exec certificados-service python manage.py migrate
```

### Nginx (Host)
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🧪 Testes

### Backend (Laravel)
```bash
# Local
cd backend/[nome-do-servico]
php artisan test

# Docker
docker-compose exec auth-service php artisan test
```

### Frontend (React)
```bash
# Local
cd frontend
npm test

# Docker
docker-compose exec frontend npm test
```

## 📚 Documentação Adicional

### Swagger/OpenAPI
- Auth Service: http://177.44.248.89:8001/api/documentation
- Eventos Service: http://177.44.248.89:8002/api/documentation
- Inscrições Service: http://177.44.248.89:8003/api/documentation
- Presença Service: http://177.44.248.89:8004/api/documentation

### Arquivos de Configuração
- `docker-compose.yml`: Orquestração dos containers
- `gateway.conf`: Configuração do proxy Nginx
- `backend/*/Dockerfile`: Imagens Docker de cada serviço
- `frontend/Dockerfile`: Imagem do React

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE.md](LICENSE.md) para detalhes.

---

🚀 **Para iniciar rapidamente**: `docker-compose up -d` e acesse http://177.44.248.89