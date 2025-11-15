<?php

use App\Http\Controllers\PresencaController;
use Illuminate\Support\Facades\Route;

// Rotas que requerem autenticação JWT + role de atendente
Route::middleware([\App\Http\Middleware\JWTMiddleware::class, \App\Http\Middleware\CheckAtendenteRole::class])->group(function () {

    // Lista de presença para carregar offline
    Route::get('/eventos/{id}/lista-presenca', [PresencaController::class, 'getListaPresencaEvento'])
        ->name('eventos.lista-presenca');

    // Check-in individual
    Route::post('/checkin', [PresencaController::class, 'checkin'])
        ->name('checkin.store');

    // Sincronização offline em lote
    Route::post('/checkin/offline-sync', [PresencaController::class, 'offlineSync'])
        ->name('checkin.offline-sync');
});

// Rotas que requerem apenas autenticação JWT (qualquer usuário pode verificar)
Route::middleware(\App\Http\Middleware\JWTMiddleware::class)->group(function () {

    // Verificar se inscrito já tem presença
    Route::get('/presencas/{inscricao_id}', [PresencaController::class, 'verificarPresenca'])
        ->name('presencas.verificar');
});
