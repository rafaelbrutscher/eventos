# Sistema de Gestão de Eventos

Sistema completo de gestão de eventos com arquitetura de microserviços, desenvolvido em Laravel (backend) e React (frontend).

## 1. Arquitetura do Sistema

### Modelo Arquitetural

```
┌─────────────────┐    ┌──────────────────────────────────────┐
│                 │    │              FRONTEND                │
│   USUÁRIOS      │◄──►│         React + TypeScript           │
│                 │    │            Porta: 80                 │
└─────────────────┘    └────────────────────────────────────┘
                         │ │ │ │ │
          ┌──────────────┘ │ │ │ └──────────────┐
          │                │ │ │                │
          v                │ │ │                v
    ┌──────────┐          │ │ │          ┌──────────┐
    │   AUTH   │          │ │ │          │CERTIFIC. │
    │ SERVICE  │          │ │ │          │ SERVICE  │
    │ Laravel  │          │ │ │          │ Django   │
    │:8001     │          │ │ │          │:8005     │
    └──────────┘          │ │ │          └──────────┘
                          │ │ │
                          v │ v
                    ┌──────────┐ ┌──────────┐
                    │ EVENTOS  │ │PRESENÇA  │
                    │ SERVICE  │ │ SERVICE  │
                    │ Laravel  │ │ Laravel  │
                    │:8002     │ │:8004     │
                    └──────────┘ └──────────┘
                          │
                          v
                    ┌──────────┐
                    │INSCRIÇÕES│
                    │ SERVICE  │
                    │ Laravel  │
                    │:8003     │
                    └──────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          v                               v
    ┌──────────┐                   ┌──────────┐
    │  MySQL   │                   │  Redis   │
    │ Database │                   │  Cache   │
    │:3306     │                   │:6379     │
    └──────────┘                   └──────────┘
```

### Tecnologias Utilizadas

#### Backend Services
- **Laravel 12.0**: Framework PHP para API REST
- **Django 5.0**: Framework Python para geração de certificados
- **PHP 8.2**: Linguagem principal dos microserviços
- **Python 3.11**: Linguagem para processamento de PDFs

#### Frontend
- **React 18**: Library para interface do usuário
- **TypeScript**: Linguagem tipada para JavaScript
- **Vite**: Build tool e dev server
- **Axios**: Cliente HTTP para comunicação com APIs

#### Banco de Dados e Cache
- **MySQL 8.0**: Banco de dados relacional compartilhado
- **Redis 7**: Cache em memória e filas de processamento

#### Infraestrutura
- **Docker**: Containerização dos serviços
- **Docker Compose**: Orquestração de containers
- **Nginx**: Servidor web para frontend estático

#### Autenticação e Processamento
- **JWT**: Tokens de autenticação entre serviços
- **Celery**: Processamento assíncrono de tarefas
- **WeasyPrint**: Geração de PDFs para certificados

### Comunicação Entre Serviços

Os microserviços comunicam-se através de APIs REST HTTP, utilizando o padrão de descoberta de serviços via Docker networking. Cada serviço é independente e pode ser escalado horizontalmente conforme necessário.


## 2. Documentação da API

### Endpoints por Serviço

#### Auth Service (Porta 8001)
**Autenticação e Gestão de Usuários**

##### Rotas Públicas
```
POST /api/register                        # Registrar novo usuário
POST /api/login                           # Login e obtenção de token JWT
POST /api/completar-cadastro              # Completar cadastro incompleto
POST /api/verificar-cadastro-incompleto   # Verificar status do cadastro
GET  /api/usuarios/{id}                   # Consultar dados de usuário (microserviços)
```

##### Rotas Protegidas (requer JWT)
```
GET  /api/usuario-logado                  # Dados do usuário autenticado
PUT  /api/perfil                          # Atualizar perfil do usuário
POST /api/logout                          # Fazer logout
POST /api/refresh                         # Renovar token JWT
POST /api/cadastro-rapido                 # Cadastro rápido (atendente/admin)
POST /api/sincronizar-lote                # Sincronização offline em lote
```

#### Eventos Service (Porta 8002)
**Gestão de Eventos - Somente Leitura**

```
GET /api/eventos                          # Listar todos os eventos ativos
GET /api/eventos/{id}                     # Detalhes de um evento específico
```

#### Inscrições Service (Porta 8003)
**Gestão de Inscrições em Eventos**

```
GET    /api/inscricoes                    # Listar inscrições do usuário
POST   /api/inscricoes                    # Criar nova inscrição
GET    /api/inscricoes/{id}               # Detalhes de uma inscrição
DELETE /api/inscricoes/{id}               # Cancelar inscrição
GET    /api/inscricoes/evento/{evento_id}/check  # Verificar se está inscrito
```

#### Presença Service (Porta 8004)
**Controle de Check-in e Presenças**

##### Rotas Restritas (atendente/admin)
```
GET  /api/eventos/{id}/lista-presenca     # Lista para modo offline
POST /api/check-in                        # Registrar presença individual
POST /api/check-in/offline-sync           # Sincronização offline
POST /api/cadastro-rapido/offline-sync    # Sincronizar cadastros offline completos
```

##### Rotas Protegidas (requer JWT)
```
GET /api/presencas/{inscricao_id}         # Verificar presença por inscrição
```

##### Rotas Públicas (para microserviços)
```
GET /api/eventos/{evento_id}/presencas    # Todas as presenças do evento
GET /api/presencas/usuario/{user_id}      # Presenças de um usuário
```

#### Certificados Service (Porta 8005)
**Geração e Validação de Certificados - Django REST**

##### CRUD de Certificados
```
GET  /api/certificados/                   # Listar certificados
POST /api/certificados/                   # Criar certificado
GET  /api/certificados/{id}/              # Detalhes do certificado
PUT  /api/certificados/{id}/              # Atualizar certificado
```

##### APIs para Usuários
```
GET  /api/meus-eventos/                   # Eventos com presença confirmada
GET  /api/meus-certificados/              # Certificados do usuário logado
POST /api/gerar-certificado/              # Gerar certificado para evento
GET  /api/certificados/{id}/download/     # Download do PDF
```

##### APIs Específicas
```
GET  /api/certificados/validar/{codigo}/  # Validar certificado por código
POST /api/gerar-certificado               # Geração automática (microserviços)
```

### Padrões da API

#### Autenticação
Todas as rotas protegidas utilizam JWT Bearer Token no header:
```
Authorization: Bearer {token}
```

#### Códigos de Resposta HTTP
- **200**: Sucesso
- **201**: Criado com sucesso
- **400**: Dados inválidos
- **401**: Não autenticado
- **403**: Sem permissão
- **404**: Recurso não encontrado
- **422**: Erro de validação
- **500**: Erro interno do servidor


#### URLs de Acesso
- **Frontend**: http://177.44.248.89
- **Auth API**: http://177.44.248.89:8001/api
- **Eventos API**: http://177.44.248.89:8002/api
- **Inscrições API**: http://177.44.248.89:8003/api
- **Presença API**: http://177.44.248.89:8004/api
- **Certificados API**: http://177.44.248.89:8005/api
