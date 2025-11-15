<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inscricao extends Model
{
    use HasFactory;

    /**
     * Nome da tabela
     */
    protected $table = 'inscricoes';

    /**
     * Campos de data customizados
     */
    const CREATED_AT = 'created_at';
    const UPDATED_AT = 'updated_at';

    /**
     * Campos que podem ser preenchidos em massa
     */
    protected $fillable = [
        'usuario_id',
        'evento_id',
        'status'
    ];

    /**
     * Campos que devem ser tratados como datas
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Valores padrão para novos modelos
     */
    protected $attributes = [
        'status' => 'ativa',
    ];

    /**
     * Scopes para consultas comuns
     */
    public function scopeAtivas($query)
    {
        return $query->where('status', 'ativa');
    }

    public function scopeCanceladas($query)
    {
        return $query->where('status', 'cancelada');
    }

    public function scopeDoUsuario($query, $usuarioId)
    {
        return $query->where('usuario_id', $usuarioId);
    }

    public function scopeDoEvento($query, $eventoId)
    {
        return $query->where('evento_id', $eventoId);
    }

    /**
     * Verifica se a inscrição está ativa
     */
    public function isAtiva(): bool
    {
        return $this->status === 'ativa';
    }

    /**
     * Cancela a inscrição
     */
    public function cancelar(): bool
    {
        $this->status = 'cancelada';
        return $this->save();
    }
}
