<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Presenca extends Model
{
    protected $table = 'presencas';

    protected $fillable = [
        'inscricao_id',
        'evento_id',
        'data_hora',
        'origem',
        'operador_usuario_id'
    ];

    protected $casts = [
        'data_hora' => 'datetime',
        'inscricao_id' => 'integer',
        'evento_id' => 'integer',
        'operador_usuario_id' => 'integer'
    ];

    // Relacionamentos
    public function logs()
    {
        return $this->hasMany(PresencaLog::class);
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

    public function scopePorOrigem($query, $origem)
    {
        return $query->where('origem', $origem);
    }

    // Métodos de conveniência
    public function isOffline()
    {
        return $this->origem === 'offline';
    }

    public function isOnline()
    {
        return $this->origem === 'online';
    }

    public function isQRCode()
    {
        return $this->origem === 'qrcode';
    }
}
