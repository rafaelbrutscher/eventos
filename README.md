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

### 5. Inicie os Serviços (Desenvolvimento Local)
```bash
# Para desenvolvimento local, use os comandos artisan serve
cd backend/auth-service && php artisan serve --port=8001
cd backend/eventos-service && php artisan serve --port=8002
cd backend/inscricoes-service && php artisan serve --port=8003
cd backend/presenca-service && php artisan serve --port=8004

# Django Service
cd backend/certificados-service && python manage.py runserver 8005

# Celery Worker
cd backend/certificados-service && celery -A certificados_service worker --loglevel=info

# Frontend
cd frontend && npm run dev
```

## 🌐 API Endpoints Completos

### 🔐 Auth Service (Porta 8001)
**Autenticação e Gestão de Usuários**

#### Rotas Públicas (sem autenticação)
- `POST /api/register` - Registrar novo usuário
- `POST /api/login` - Login e obtenção de token JWT
- `POST /api/completar-cadastro` - Completar cadastro incompleto
- `POST /api/verificar-cadastro-incompleto` - Verificar se cadastro está incompleto

#### Rotas Protegidas (requer JWT)
- `GET /api/usuario-logado` - Dados do usuário logado
- `PUT /api/perfil` - Atualizar perfil do usuário
- `POST /api/logout` - Fazer logout
- `POST /api/refresh` - Renovar token JWT
- `POST /api/cadastro-rapido` - Cadastro rápido (apenas atendente/admin)
- `POST /api/sincronizar-lote` - Sincronização offline em lote (atendente/admin)

#### Rotas Inter-serviços
- `GET /api/usuarios/{id}` - Buscar usuário por ID (para outros microserviços)

#### Utilitárias
- `GET /up` - Health check do serviço
- `GET /storage/{path}` - Servir arquivos de storage

---

### 🎪 Eventos Service (Porta 8002)
**Gestão de Eventos - APENAS LEITURA**

#### Rotas Públicas
- `GET /api/eventos` - Listar todos os eventos ativos (data_fim >= hoje)
- `GET /api/eventos/{id}` - Detalhes de um evento específico

#### Rotas de Teste/Debug
- `GET /test/eventos` - Rota de teste (mesma funcionalidade)
- `GET /test/eventos/{id}` - Rota de teste para evento específico
- `GET /teste` - Endpoint de teste básico

#### Utilitárias
- `GET /up` - Health check do serviço
- `GET /storage/{path}` - Servir arquivos de storage

---

### 📝 Inscrições Service (Porta 8003)
**Gestão de Inscrições em Eventos**

#### Todas as rotas requerem autenticação JWT
- `GET /api/inscricoes` - Listar inscrições do usuário logado
- `POST /api/inscricoes` - Criar nova inscrição em evento
- `GET /api/inscricoes/{id}` - Detalhes de uma inscrição específica
- `DELETE /api/inscricoes/{id}` - Cancelar inscrição
- `GET /api/inscricoes/evento/{evento_id}/check` - Verificar se usuário está inscrito

#### Utilitárias
- `GET /up` - Health check do serviço
- `GET /storage/{path}` - Servir arquivos de storage
- `GET /test` - Endpoint de teste básico

---

### ✅ Presença Service (Porta 8004)
**Controle de Check-in e Presenças**

#### Rotas Restritas (JWT + Role Atendente/Admin)
- `POST /api/check-in` - Registrar presença individual
- `POST /api/check-in/offline-sync` - Sincronização offline de presenças em lote
- `GET /api/eventos/{id}/lista-presenca` - Lista completa para modo offline

#### Rotas Protegidas (apenas JWT)
- `GET /api/presencas/{inscricao_id}` - Verificar se inscrito já tem presença

#### Rotas Públicas (para certificados-service)
- `GET /api/eventos/{evento_id}/presencas` - Todas as presenças de um evento
- `GET /api/presencas/usuario/{user_id}` - Presenças de um usuário específico

#### Utilitárias
- `GET /up` - Health check do serviço
- `GET /storage/{path}` - Servir arquivos de storage

---

### 🏆 Certificados Service (Porta 8005)
**Geração e Validação de Certificados - Django/Python**

#### API REST (DRF ViewSet)
- `GET /api/certificados/` - Listar certificados
- `POST /api/certificados/` - Criar certificado
- `GET /api/certificados/{id}/` - Detalhes de certificado
- `PUT /api/certificados/{id}/` - Atualizar certificado
- `DELETE /api/certificados/{id}/` - Deletar certificado

#### APIs Específicas para Usuários
- `GET /api/meus-eventos/` - Listar eventos onde usuário teve presença
- `POST /api/gerar-certificado/` - Gerar certificado para usuário em evento
- `GET /api/certificados/{certificado_id}/download/` - Download do PDF

#### Painel Administrativo
- `/admin/` - Interface Django Admin

---

## 📊 Análise de Necessidade das Rotas

### ✅ **Rotas Essenciais (Manter)**
- **Auth**: Login, registro, cadastro rápido, sincronização
- **Eventos**: Listagem e detalhes (público)  
- **Inscrições**: CRUD completo de inscrições
- **Presença**: Check-in com offline-sync
- **Certificados**: Geração e download de PDFs

### ⚠️ **Rotas Questionáveis (Revisar)**
- **Eventos Service**: 
  - `GET /test/*` - Rotas de teste duplicadas (REMOVER?)
  - `GET /teste` - Endpoint genérico sem função (REMOVER?)
- **Inscricoes Service**:
  - `GET /test` - Endpoint de teste sem uso (REMOVER?)
- **Auth Service**:
  - `GET /` - Rota raiz sem função definida (REMOVER?)

### 🔄 **Rotas Inter-serviços (Críticas)**
- `GET /api/usuarios/{id}` (Auth) - Usada por outros serviços
- `GET /api/eventos/{evento_id}/presencas` (Presença) - Para certificados
- `GET /api/presencas/usuario/{user_id}` (Presença) - Para certificados

### 📋 **Resumo por Funcionalidade**
1. **Sistema Offline**: 6 rotas específicas para funcionalidade offline
2. **CRUD Básico**: 15 rotas para operações essenciais
3. **Health Checks**: 5 rotas `/up` para monitoramento
4. **Testes/Debug**: 4 rotas que podem ser removidas
5. **Inter-serviços**: 3 rotas críticas para comunicação entre services

---

## 🧹 Recomendações de Otimização

### 🗑️ **Rotas para Remover (Limpeza)**
```bash
# Eventos Service - Remover rotas de teste duplicadas
GET /test/eventos          # Duplicata de /api/eventos
GET /test/eventos/{id}     # Duplicata de /api/eventos/{id}  
GET /teste                 # Sem funcionalidade

# Inscricoes Service - Remover teste genérico
GET /test                  # Sem funcionalidade específica

# Auth Service - Remover rota raiz vazia
GET /                      # Sem funcionalidade definida
```

### ⚡ **Otimizações Sugeridas**
1. **Consolidação**: Mover todas as rotas de teste para um controller específico
2. **Padronização**: Todos os health checks em `/health` em vez de `/up`
3. **Versionamento**: Adicionar `/v1/` nas rotas para futuras versões
4. **Rate Limiting**: Implementar rate limiting nas rotas públicas
5. **CORS**: Configurar CORS apropriadamente para cada serviço

### 🏗️ **Arquitetura de Rotas Limpa**
```
Auth Service (8001)     - 11 rotas (essenciais: autenticação + offline)
Eventos Service (8002)  - 4 rotas  (essenciais: apenas leitura pública)
Inscrições Service (8003) - 7 rotas (essenciais: CRUD de inscrições)
Presença Service (8004) - 8 rotas  (essenciais: check-in + offline)
Certificados (8005)     - 8 rotas  (essenciais: geração + download)
----------------------------------------
TOTAL: 38 rotas essenciais (atual: 42 rotas)
REDUÇÃO: 4 rotas desnecessárias (-9.5%)
```

### 🎯 **Próximos Passos Recomendados**
1. Remover rotas de teste não utilizadas
2. Implementar middleware de rate limiting
3. Adicionar documentação Swagger/OpenAPI
4. Configurar monitoramento de performance
5. Implementar cache Redis nas consultas frequentes

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

## 🚀 Deploy em Produção (Docker)

### Configuração Rápida
```bash
# 1. Clone e configure
git clone https://github.com/rafaelbrutscher/eventos.git && cd eventos

# 2. Copie configurações de produção
cp backend/auth-service/.env.example backend/auth-service/.env
cp backend/eventos-service/.env.example backend/eventos-service/.env  
cp backend/inscricoes-service/.env.example backend/inscricoes-service/.env
cp backend/presenca-service/.env.example backend/presenca-service/.env
cp backend/certificados-service/.env.example backend/certificados-service/.env

# 3. Inicie todos os serviços
docker-compose up -d --build

# 4. Execute migrações
docker-compose exec auth-service php artisan migrate --force
docker-compose exec eventos-service php artisan migrate --force
docker-compose exec inscricoes-service php artisan migrate --force  
docker-compose exec presenca-service php artisan migrate --force
docker-compose exec certificados-service python manage.py migrate

# 5. Acesse o sistema
# Gateway: http://177.44.248.89
# Frontend: http://177.44.248.89:3000
```

### 📋 Checklist Completo
Veja **DEPLOY-PRODUCAO.md** para checklist detalhado de produção.

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