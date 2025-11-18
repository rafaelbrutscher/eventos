<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Remover a constraint atual que impede múltiplas inscrições
        Schema::table('inscricoes', function (Blueprint $table) {
            $table->dropUnique('unique_user_evento');
        });

        // Não vamos adicionar constraint no banco, vamos controlar via código
        // Isso permite múltiplas inscrições, mas o controller vai validar
        // que apenas uma pode estar ativa por usuário/evento
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recriar a constraint original se necessário
        Schema::table('inscricoes', function (Blueprint $table) {
            $table->unique(['usuario_id', 'evento_id'], 'unique_user_evento');
        });
    }
};
