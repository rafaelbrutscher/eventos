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
        Schema::table('inscricoes', function (Blueprint $table) {
            // Remover a constraint problemática
            $table->dropUnique('unique_active_inscription');

            // Adicionar nova constraint que só impede múltiplas inscrições ATIVAS
            $table->unique(['usuario_id', 'evento_id'], 'unique_user_evento');

            // Adicionar índice para status separadamente
            $table->index(['usuario_id', 'evento_id', 'status'], 'idx_inscricoes_user_evento_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inscricoes', function (Blueprint $table) {
            // Reverter as mudanças
            $table->dropUnique('unique_user_evento');
            $table->dropIndex('idx_inscricoes_user_evento_status');

            // Restaurar constraint original (se necessário)
            $table->unique(['usuario_id', 'evento_id', 'status'], 'unique_active_inscription');
        });
    }
};
