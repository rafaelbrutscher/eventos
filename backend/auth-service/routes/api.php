<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

// Rotas públicas (sem autenticação)
Route::post('/usuarios', [AuthController::class, 'register']);
Route::post('/auth', [AuthController::class, 'login']);

// Rotas protegidas (com autenticação JWT)
Route::middleware(['jwt.auth'])->group(function () {
    Route::get('/usuario-logado', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
});
