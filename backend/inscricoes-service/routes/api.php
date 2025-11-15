<?php

use App\Http\Controllers\InscricaoController;
use Illuminate\Support\Facades\Route;

// Todas as rotas do inscricoes-service requerem autenticação JWT
Route::middleware(\App\Http\Middleware\JWTMiddleware::class)->group(function () {

    // Rotas de inscrições
    Route::get('/inscricoes', [InscricaoController::class, 'index'])
        ->name('inscricoes.index');

    Route::post('/inscricoes', [InscricaoController::class, 'store'])
        ->name('inscricoes.store');

    Route::get('/inscricoes/{id}', [InscricaoController::class, 'show'])
        ->name('inscricoes.show');

    Route::delete('/inscricoes/{id}', [InscricaoController::class, 'destroy'])
        ->name('inscricoes.destroy');

    // Verificar se usuário está inscrito em um evento
    Route::get('/inscricoes/evento/{evento_id}/check', [InscricaoController::class, 'checkInscricao'])
        ->name('inscricoes.check');
});
