# Eventos Service

Microserviço responsável por fornecer informações sobre eventos no sistema.

## 🚀 Como executar

### Pré-requisitos
- PHP 8.2+
- Composer
- SQLite (configurado por padrão)

### Instalação
```bash
# 1. Instalar dependências
composer install

# 2. Executar migrations
php artisan migrate

# 3. Executar o servidor na porta 8002
php artisan serve --port=8002
```

## 📋 Funcionalidades

- **GET /api/eventos** - Lista todos os eventos ativos
- **GET /api/eventos/{id}** - Detalhes de um evento específico

## 📁 Estrutura

```
eventos-service/
├── app/
│   ├── Http/Controllers/
│   │   └── EventoController.php      # Controller principal
│   └── Models/
│       └── Event.php                 # Model do evento
├── database/
│   └── migrations/
│       └── *_create_eventos_table.php # Migration da tabela
├── routes/
│   └── api.php                       # Rotas da API
└── API_DOCUMENTATION.md              # Documentação completa
```

## 🗄️ Estrutura da Tabela

```sql
CREATE TABLE eventos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    data_inicio DATETIME NOT NULL,
    data_fim DATETIME NOT NULL,
    template_certificado VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

## 🔧 Configurações

- **Porta:** 8002 (configurada no .env)
- **Banco:** SQLite (database/database.sqlite)
- **Logs:** storage/logs/laravel.log

## 📖 Documentação

Veja `API_DOCUMENTATION.md` para documentação completa da API com exemplos de uso.

## 🌐 Integração com outros serviços

Este serviço foi projetado para ser consumido por:
- Portal web (frontend)
- Serviço de inscrições
- Serviço de certificados
- Outros microserviços que precisem validar eventos

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
