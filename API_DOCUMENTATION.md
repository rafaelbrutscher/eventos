# Sistema de Eventos - Documentação da API

## Arquitetura do Sistema

O sistema utiliza uma **arquitetura de microserviços** com os seguintes componentes:

- **Frontend**: React 18.2.0 + TypeScript + Vite (Porta 5173)
- **Auth Service**: Laravel 12.0 - Autenticação e JWT (Porta 8001)
- **Eventos Service**: Laravel 12.0 - Gestão de eventos (Porta 8002)  
- **Inscricoes Service**: Laravel 12.0 - Gestão de inscrições (Porta 8003)
- **Banco de Dados**: MySQL - Database `eventos` compartilhado

---

## Auth Service (Porta 8001)

### Base URL
```
http://localhost:8001
```

### Endpoints

#### POST /api/register
**Descrição**: Registra um novo usuário no sistema

**Headers**:
```json
{
  "Content-Type": "application/json"
}
```

**Body**:
```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "senha123",
  "password_confirmation": "senha123"
}
```

**Resposta 201 - Sucesso**:
```json
{
  "message": "Usuário registrado com sucesso",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "created_at": "2025-11-15T10:00:00Z",
    "updated_at": "2025-11-15T10:00:00Z"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

#### POST /api/login
**Descrição**: Autentica um usuário e retorna JWT token

**Body**:
```json
{
  "email": "joao@exemplo.com",
  "password": "senha123"
}
```

**Resposta 200 - Sucesso**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@exemplo.com"
  }
}
```

#### POST /api/logout
**Descrição**: Invalida o token JWT do usuário

**Headers**:
```json
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}
```

**Resposta 200 - Sucesso**:
```json
{
  "message": "Successfully logged out"
}
```

#### GET /api/me
**Descrição**: Retorna informações do usuário autenticado

**Headers**:
```json
{
  "Authorization": "Bearer {token}"
}
```

**Resposta 200 - Sucesso**:
```json
{
  "id": 1,
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "created_at": "2025-11-15T10:00:00Z",
  "updated_at": "2025-11-15T10:00:00Z"
}
```

#### POST /api/refresh
**Descrição**: Renova o token JWT

**Headers**:
```json
{
  "Authorization": "Bearer {token}"
}
```

**Resposta 200 - Sucesso**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

---

## 📅 Eventos Service (Porta 8002)

### Base URL
```
http://localhost:8002
```

### Endpoints

#### GET /api/eventos
**Descrição**: Lista todos os eventos disponíveis

**Headers** (Opcional):
```json
{
  "Authorization": "Bearer {token}"
}
```

**Query Parameters**:
- `page` (opcional): Número da página para paginação
- `per_page` (opcional): Itens por página (padrão: 15)
- `search` (opcional): Busca por título ou descrição
- `categoria` (opcional): Filtro por categoria
- `data_inicio` (opcional): Filtro por data de início (YYYY-MM-DD)

**Resposta 200 - Sucesso**:
```json
{
  "data": [
    {
      "id": 1,
      "titulo": "Workshop de React",
      "descricao": "Aprenda os fundamentos do React",
      "data_inicio": "2025-12-01T09:00:00Z",
      "data_fim": "2025-12-01T17:00:00Z",
      "local": "Centro de Convenções",
      "categoria": "Tecnologia",
      "vagas_totais": 50,
      "vagas_ocupadas": 15,
      "vagas_disponiveis": 35,
      "preco": 150.00,
      "ativo": true,
      "created_at": "2025-11-15T10:00:00Z",
      "updated_at": "2025-11-15T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "per_page": 15,
    "total": 42
  }
}
```

#### GET /api/eventos/{id}
**Descrição**: Retorna detalhes de um evento específico

**Resposta 200 - Sucesso**:
```json
{
  "id": 1,
  "titulo": "Workshop de React",
  "descricao": "Aprenda os fundamentos do React",
  "data_inicio": "2025-12-01T09:00:00Z",
  "data_fim": "2025-12-01T17:00:00Z",
  "local": "Centro de Convenções",
  "categoria": "Tecnologia",
  "vagas_totais": 50,
  "vagas_ocupadas": 15,
  "vagas_disponiveis": 35,
  "preco": 150.00,
  "ativo": true,
  "created_at": "2025-11-15T10:00:00Z",
  "updated_at": "2025-11-15T10:00:00Z"
}
```

#### GET /api/health
**Descrição**: Health check do serviço

**Resposta 200 - Sucesso**:
```json
{
  "status": "healthy",
  "service": "eventos-service",
  "timestamp": "2025-11-15T10:00:00Z",
  "database": "connected"
}
```

---

## 📝 Inscrições Service (Porta 8003)

### Base URL
```
http://localhost:8003
```

### Endpoints

#### GET /api/inscricoes
**Descrição**: Lista inscrições do usuário autenticado

**Headers**:
```json
{
  "Authorization": "Bearer {token}"
}
```

**Query Parameters**:
- `status` (opcional): Filtro por status (pendente, confirmada, cancelada)
- `evento_id` (opcional): Filtro por ID do evento

**Resposta 200 - Sucesso**:
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "evento_id": 1,
      "status": "confirmada",
      "data_inscricao": "2025-11-15T10:00:00Z",
      "observacoes": "Participação confirmada",
      "created_at": "2025-11-15T10:00:00Z",
      "updated_at": "2025-11-15T10:00:00Z",
      "evento": {
        "id": 1,
        "titulo": "Workshop de React",
        "data_inicio": "2025-12-01T09:00:00Z",
        "local": "Centro de Convenções"
      }
    }
  ]
}
```

#### POST /api/inscricoes
**Descrição**: Cria uma nova inscrição para um evento

**Headers**:
```json
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}
```

**Body**:
```json
{
  "evento_id": 1,
  "observacoes": "Gostaria de participar do workshop"
}
```

**Resposta 201 - Sucesso**:
```json
{
  "message": "Inscrição realizada com sucesso",
  "inscricao": {
    "id": 1,
    "user_id": 1,
    "evento_id": 1,
    "status": "pendente",
    "data_inscricao": "2025-11-15T10:00:00Z",
    "observacoes": "Gostaria de participar do workshop",
    "created_at": "2025-11-15T10:00:00Z",
    "updated_at": "2025-11-15T10:00:00Z"
  }
}
```

#### GET /api/inscricoes/{id}
**Descrição**: Retorna detalhes de uma inscrição específica

**Headers**:
```json
{
  "Authorization": "Bearer {token}"
}
```

**Resposta 200 - Sucesso**:
```json
{
  "id": 1,
  "user_id": 1,
  "evento_id": 1,
  "status": "confirmada",
  "data_inscricao": "2025-11-15T10:00:00Z",
  "observacoes": "Participação confirmada",
  "created_at": "2025-11-15T10:00:00Z",
  "updated_at": "2025-11-15T10:00:00Z",
  "evento": {
    "id": 1,
    "titulo": "Workshop de React",
    "descricao": "Aprenda os fundamentos do React",
    "data_inicio": "2025-12-01T09:00:00Z",
    "data_fim": "2025-12-01T17:00:00Z",
    "local": "Centro de Convenções"
  },
  "usuario": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@exemplo.com"
  }
}
```

#### DELETE /api/inscricoes/{id}
**Descrição**: Cancela uma inscrição

**Headers**:
```json
{
  "Authorization": "Bearer {token}"
}
```

**Resposta 200 - Sucesso**:
```json
{
  "message": "Inscrição cancelada com sucesso"
}
```

#### GET /api/health
**Descrição**: Health check do serviço

**Resposta 200 - Sucesso**:
```json
{
  "status": "healthy",
  "service": "inscricoes-service",
  "timestamp": "2025-11-15T10:00:00Z",
  "database": "connected",
  "external_services": {
    "auth_service": "connected",
    "eventos_service": "connected"
  }
}
```

#### GET /api/status
**Descrição**: Status público do serviço (sem autenticação)

**Resposta 200 - Sucesso**:
```json
{
  "service": "inscricoes-service",
  "status": "operational",
  "version": "1.0.0",
  "timestamp": "2025-11-15T10:00:00Z"
}
```

---

## 🌐 Frontend React (Porta 5173)

### Base URL
```
http://localhost:5173
```

### Rotas Disponíveis

#### Públicas
- `/` - Página inicial
- `/login` - Página de login
- `/eventos` - Lista de eventos (visualização pública)

#### Protegidas (Requer autenticação)
- `/dashboard` - Dashboard do usuário
- `/inscricoes` - Gerenciar inscrições
- `/eventos/{id}` - Detalhes do evento com botão de inscrição
- `/perfil` - Perfil do usuário

### Integração com APIs
O frontend consome todos os microserviços através do arquivo `src/services/api.ts` que centraliza as chamadas HTTP.

---

## 🔧 Configuração e Ambiente

### Variáveis de Ambiente

#### Auth Service (.env)
```env
APP_NAME="Auth Service"
APP_URL=http://localhost:8001
DB_DATABASE=eventos
JWT_SECRET=sua_chave_jwt_secreta
JWT_TTL=1440
```

#### Eventos Service (.env)
```env
APP_NAME="Eventos Service"  
APP_URL=http://localhost:8002
DB_DATABASE=eventos
```

#### Inscrições Service (.env)
```env
APP_NAME="Inscricoes Service"
APP_URL=http://localhost:8003
DB_DATABASE=eventos
JWT_SECRET=sua_chave_jwt_secreta
AUTH_SERVICE_URL=http://127.0.0.1:8001
EVENTOS_SERVICE_URL=http://127.0.0.1:8002
```

### Banco de Dados

#### Tabelas Principais

**users**
- id (PK)
- name
- email (unique)
- password
- created_at
- updated_at

**eventos**
- id (PK)
- titulo
- descricao
- data_inicio
- data_fim
- local
- categoria
- vagas_totais
- preco
- ativo
- created_at
- updated_at

**inscricoes**
- id (PK)
- user_id (FK)
- evento_id (FK)
- status (enum: pendente, confirmada, cancelada)
- data_inscricao
- observacoes
- created_at
- updated_at

---

## 🚀 Como Executar

### Pré-requisitos
- PHP 8.2+
- Composer
- Node.js 18+
- MySQL
- Laragon (ou XAMPP/WAMP)

### Iniciando os Serviços

```bash
# Auth Service
cd backend/auth-service
php artisan serve --port=8001

# Eventos Service  
cd backend/eventos-service
php artisan serve --port=8002

# Inscrições Service
cd backend/inscricoes-service
php artisan serve --port=8003

# Frontend React
cd frontend
npm run dev
```

### Executando Migrações

```bash
# Em cada microservice Laravel
php artisan migrate
```

---

## 🔍 Logs e Monitoramento

Todos os microserviços implementam logging automático através do middleware `LogRequestsMiddleware`:

- **Logs de Request**: Method, URL, Headers (filtrados), Body
- **Logs de Response**: Status, Headers, Body  
- **Filtragem**: Senhas e tokens são automaticamente filtrados
- **Localização**: `storage/logs/laravel-{date}.log` em cada serviço

---

## 📊 Status dos Serviços

| Serviço | Status | Porta | Funcionalidades |
|---------|--------|-------|----------------|
| Auth Service | ✅ Implementado | 8001 | Registro, Login, JWT, Profile |
| Eventos Service | ✅ Implementado | 8002 | CRUD Eventos, Listagem Pública |
| Inscrições Service | ✅ Implementado | 8003 | CRUD Inscrições, Validações |
| Frontend React | ✅ Implementado | 5173 | SPA, Rotas Protegidas, Integração |
| Database MySQL | ✅ Configurado | 3306 | Tabelas e Relacionamentos |

---

## 🔄 Próximas Implementações

- [ ] Sistema de notificações por email
- [ ] Dashboard administrativo
- [ ] Relatórios de eventos
- [ ] Sistema de avaliações
- [ ] Upload de imagens para eventos
- [ ] Sistema de pagamentos
- [ ] Integração com calendário

---

**Última atualização**: 15/11/2025  
**Versão da documentação**: 1.0.0