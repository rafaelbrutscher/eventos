<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Rotas públicas para cadastro
Route::post('/completar-cadastro', [AuthController::class, 'completarCadastro']);
Route::post('/verificar-cadastro-incompleto', [AuthController::class, 'verificarCadastroIncompleto']);

// Rotas para cadastro rápido
use App\Http\Controllers\CadastroRapidoController;
Route::middleware(['jwt.auth'])->group(function () {
    Route::post('/cadastro-rapido', [CadastroRapidoController::class, 'cadastroRapido']);
    Route::post('/sincronizar-lote', [CadastroRapidoController::class, 'sincronizarLote']);
});

Route::middleware(['jwt.auth'])->group(function () {
    Route::get('/usuario-logado', [AuthController::class, 'me']);
    Route::put('/perfil', [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
});

// Rota para outros microserviços consultarem dados de usuário
Route::get('/usuarios/{id}', [AuthController::class, 'getUserById']);
