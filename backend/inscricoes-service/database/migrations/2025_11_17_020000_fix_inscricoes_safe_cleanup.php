<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Remover constraint antiga se existir (ignora erro)
        try {
            DB::statement('ALTER TABLE inscricoes DROP INDEX unique_active_inscription');
        } catch (\Exception $e) {
            // Ignora se não existir
        }

        // Adicionar nova constraint única
        try {
            DB::statement('ALTER TABLE inscricoes ADD UNIQUE KEY unique_user_evento (usuario_id, evento_id)');
        } catch (\Exception $e) {
            // Ignora se já existir
        }

        // Adicionar índice
        try {
            DB::statement('ALTER TABLE inscricoes ADD INDEX idx_status (usuario_id, evento_id, status)');
        } catch (\Exception $e) {
            // Ignora se já existir
        }
    }

    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE inscricoes DROP INDEX IF EXISTS unique_user_evento');
            DB::statement('ALTER TABLE inscricoes DROP INDEX IF EXISTS idx_status');
        } catch (\Exception $e) {
            // Ignora erros
        }
    }
};
