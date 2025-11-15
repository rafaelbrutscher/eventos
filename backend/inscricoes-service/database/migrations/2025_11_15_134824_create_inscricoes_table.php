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
        Schema::create('inscricoes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('usuario_id')->comment('ID do usuário inscrito');
            $table->unsignedBigInteger('evento_id')->comment('ID do evento');
            $table->enum('status', ['ativa', 'cancelada'])->default('ativa');;
            $table->timestamps();

            $table->index(['usuario_id', 'evento_id']);
            $table->index('status');

            $table->unique(['usuario_id', 'evento_id', 'status'], 'unique_active_inscription');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inscricoes');
    }
};
