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
        Schema::create('presencas', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('inscricao_id')->comment('ID da inscrição');
            $table->unsignedBigInteger('evento_id')->comment('ID do evento');
            $table->dateTime('data_hora')->comment('Data e hora do check-in');
            $table->enum('origem', ['online', 'offline', 'qrcode'])->default('online')->comment('Origem do check-in');
            $table->unsignedBigInteger('operador_usuario_id')->nullable()->comment('ID do operador que fez o check-in');
            $table->timestamps();

            // Índices para performance
            $table->index(['inscricao_id', 'evento_id']);
            $table->index('evento_id');
            $table->index('data_hora');
            $table->index('origem');

            // Garantir que uma inscrição só pode ter um check-in por evento
            $table->unique(['inscricao_id', 'evento_id'], 'unique_checkin_por_inscricao');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('presencas');
    }
};
