<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'service' => 'Inscricoes Service',
        'status' => 'running',
        'timestamp' => now()
    ]);
});

Route::get('/test', function () {
    return response()->json([
        'message' => 'Inscricoes Service is working!',
        'timestamp' => now()
    ]);
});
