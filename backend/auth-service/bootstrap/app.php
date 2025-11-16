<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'jwt.auth' => \App\Http\Middleware\JWTMiddleware::class,
            'cors' => \App\Http\Middleware\CorsMiddleware::class,
        ]);

        // Configuração de CORS - aplicar a todas as rotas API
        $middleware->api([
            \App\Http\Middleware\CorsMiddleware::class,
        ]);

        // Middleware de logs removido para reduzir ruído nos logs
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
