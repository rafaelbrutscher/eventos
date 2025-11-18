<?php

use App\Http\Controllers\PresencaController;
use Illuminate\Support\Facades\Route;

// Rotas que requerem autenticação JWT + role de atendente
Route::middleware([\App\Http\Middleware\JWTMiddleware::class, \App\Http\Middleware\CheckAtendenteRole::class])->group(function () {

    // Lista de presença para carregar offline
    Route::get('/eventos/{id}/lista-presenca', [PresencaController::class, 'getListaPresencaEvento'])
        ->name('eventos.lista-presenca');

    // Check-in individual
    Route::post('/check-in', [PresencaController::class, 'checkin'])
        ->name('checkin.store');

    // Sincronização offline em lote
    Route::post('/check-in/offline-sync', [PresencaController::class, 'offlineSync'])
        ->name('checkin.offline-sync');
});

// Rotas que requerem apenas autenticação JWT (qualquer usuário pode verificar)
Route::middleware(\App\Http\Middleware\JWTMiddleware::class)->group(function () {

    // Verificar se inscrito já tem presença
    Route::get('/presencas/{inscricao_id}', [PresencaController::class, 'verificarPresenca'])
        ->name('presencas.verificar');
});

// Rota pública para certificados-service buscar presenças de um evento
Route::get('/eventos/{evento_id}/presencas', [PresencaController::class, 'getPresencasPorEvento'])
    ->name('eventos.presencas');

// Rota pública para listar presenças de um usuário específico (para certificados)
Route::get('/presencas/usuario/{user_id}', [PresencaController::class, 'getPresencasPorUsuario'])
    ->name('presencas.usuario');
