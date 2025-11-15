<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PresencaLog extends Model
{
    protected $table = 'presenca_logs';

    protected $fillable = [
        'presenca_id',
        'inscricao_id',
        'evento_id',
        'acao',
        'origem',
        'dados_originais',
        'motivo_falha',
        'operador_usuario_id',
        'ip_address'
    ];

    protected $casts = [
        'dados_originais' => 'array',
        'presenca_id' => 'integer',
        'inscricao_id' => 'integer',
        'evento_id' => 'integer',
        'operador_usuario_id' => 'integer'
    ];

    // Relacionamentos
    public function presenca()
    {
        return $this->belongsTo(Presenca::class);
    }

    // Scopes
    public function scopeDoEvento($query, $eventoId)
    {
        return $query->where('evento_id', $eventoId);
    }

    public function scopeDaInscricao($query, $inscricaoId)
    {
        return $query->where('inscricao_id', $inscricaoId);
    }

    public function scopePorAcao($query, $acao)
    {
        return $query->where('acao', $acao);
    }

    // Métodos estáticos para log
    public static function logTentativa($inscricaoId, $eventoId, $origem, $dados = null, $operadorId = null, $ip = null)
    {
        return self::create([
            'inscricao_id' => $inscricaoId,
            'evento_id' => $eventoId,
            'acao' => 'checkin_tentativa',
            'origem' => $origem,
            'dados_originais' => $dados,
            'operador_usuario_id' => $operadorId,
            'ip_address' => $ip
        ]);
    }

    public static function logSucesso($presencaId, $inscricaoId, $eventoId, $origem, $dados = null, $operadorId = null, $ip = null)
    {
        return self::create([
            'presenca_id' => $presencaId,
            'inscricao_id' => $inscricaoId,
            'evento_id' => $eventoId,
            'acao' => 'checkin_sucesso',
            'origem' => $origem,
            'dados_originais' => $dados,
            'operador_usuario_id' => $operadorId,
            'ip_address' => $ip
        ]);
    }

    public static function logFalha($inscricaoId, $eventoId, $origem, $motivo, $dados = null, $operadorId = null, $ip = null)
    {
        return self::create([
            'inscricao_id' => $inscricaoId,
            'evento_id' => $eventoId,
            'acao' => 'checkin_falha',
            'origem' => $origem,
            'motivo_falha' => $motivo,
            'dados_originais' => $dados,
            'operador_usuario_id' => $operadorId,
            'ip_address' => $ip
        ]);
    }
}
