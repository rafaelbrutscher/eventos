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
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('cadastro_completo')->default(true)->after('role');
            $table->timestamp('cadastro_rapido_em')->nullable()->after('cadastro_completo');
        });

        // Alterar password para nullable
        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['cadastro_completo', 'cadastro_rapido_em']);
        });

        // Restaurar password como obrigatório
        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable(false)->change();
        });
    }
};
