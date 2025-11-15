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
        Schema::create('presenca_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('presenca_id')->nullable()->comment('ID da presença (null se falhou)');
            $table->unsignedBigInteger('inscricao_id')->comment('ID da inscrição');
            $table->unsignedBigInteger('evento_id')->comment('ID do evento');
            $table->enum('acao', ['checkin_tentativa', 'checkin_sucesso', 'checkin_falha', 'sync_offline'])->comment('Tipo de ação');
            $table->enum('origem', ['online', 'offline', 'qrcode'])->comment('Origem da ação');
            $table->json('dados_originais')->nullable()->comment('Dados originais da requisição');
            $table->text('motivo_falha')->nullable()->comment('Motivo da falha se houve');
            $table->unsignedBigInteger('operador_usuario_id')->nullable()->comment('ID do operador');
            $table->string('ip_address', 45)->nullable()->comment('IP da requisição');
            $table->timestamps();

            // Índices para auditoria e performance
            $table->index(['evento_id', 'acao']);
            $table->index(['inscricao_id', 'acao']);
            $table->index('origem');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('presenca_logs');
    }
};
