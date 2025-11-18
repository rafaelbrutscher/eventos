<?php
require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

use App\Models\User;

$user = User::find(2);
if ($user) {
    $user->role = 'admin';
    $user->save();
    echo "Usuário {$user->name} agora é admin!\n";
} else {
    echo "Usuário não encontrado!\n";
}
