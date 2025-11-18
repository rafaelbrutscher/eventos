<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'cadastro_completo',
        'cadastro_rapido_em',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'cadastro_completo' => 'boolean',
            'cadastro_rapido_em' => 'datetime',
        ];
    }

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     *
     * @return mixed
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     *
     * @return array
     */
    public function getJWTCustomClaims()
    {
        return [
            'role' => $this->role,
            'email' => $this->email,
            'name' => $this->name
        ];
    }

    /**
     * Verifica se o usuário é participante
     */
    public function isParticipante()
    {
        return $this->role === 'participante';
    }

    /**
     * Verifica se o usuário é atendente
     */
    public function isAtendente()
    {
        return $this->role === 'atendente';
    }

    /**
     * Verifica se o usuário é admin
     */
    public function isAdmin()
    {
        return $this->role === 'admin';
    }

    /**
     * Verifica se o usuário pode fazer check-in (atendente ou admin)
     */
    public function canCheckIn()
    {
        return in_array($this->role, ['atendente', 'admin']);
    }

    /**
     * Verifica se o usuário tem cadastro incompleto
     */
    public function isCadastroIncompleto()
    {
        return !$this->cadastro_completo;
    }

    /**
     * Marca o cadastro como completo
     */
    public function completarCadastro()
    {
        $this->update([
            'cadastro_completo' => true,
            'cadastro_rapido_em' => null,
        ]);
    }
}
