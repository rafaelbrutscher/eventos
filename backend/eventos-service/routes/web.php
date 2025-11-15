<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EventoController;

Route::get('/', function () {
    return view('welcome');
});

// Teste temporário - rotas de eventos no web.php
Route::get('/test/eventos', [EventoController::class, 'index']);
Route::get('/test/eventos/{id}', [EventoController::class, 'show']);

// Rota de teste simples
Route::get('/teste', function() {
    return response()->json(['message' => 'Servidor funcionando', 'time' => now()]);
});
