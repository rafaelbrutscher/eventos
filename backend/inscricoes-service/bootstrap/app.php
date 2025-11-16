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
        // Alias para middlewares personalizados
        $middleware->alias([
            'jwt.auth' => \App\Http\Middleware\JWTMiddleware::class,
        ]);

        // Configuração de CORS
        $middleware->api([
            \App\Http\Middleware\CorsMiddleware::class,
        ]);

        $middleware->alias([
            'cors' => \App\Http\Middleware\CorsMiddleware::class,
        ]);

        // Middleware de logs removido para reduzir ruído nos logs
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
