<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class AuthService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('app.auth_service_url', env('AUTH_SERVICE_URL', 'http://127.0.0.1:8001'));
    }

    /**
     * Valida se um usuário existe
     */
    public function validateUser(int $usuarioId): array
    {
        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/api/usuarios/{$usuarioId}");

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'exists' => true,
                    'data' => $data['data'] ?? null
                ];
            }

            if ($response->status() === 404) {
                Log::warning('Usuário não encontrado', [
                    'service' => 'inscricoes-service',
                    'action' => 'validate_user_not_found',
                    'usuario_id' => $usuarioId
                ]);

                return ['exists' => false, 'data' => null];
            }

            Log::error('Erro na validação do usuário', [
                'service' => 'inscricoes-service',
                'action' => 'validate_user_error',
                'usuario_id' => $usuarioId,
                'status_code' => $response->status(),
                'response' => $response->body()
            ]);

            throw new Exception("Erro ao validar usuário: HTTP {$response->status()}");

        } catch (Exception $e) {
            Log::error('Falha crítica na validação do usuário', [
                'service' => 'inscricoes-service',
                'action' => 'validate_user_critical_error',
                'usuario_id' => $usuarioId,
                'error' => $e->getMessage()
            ]);

            throw new Exception("Falha na comunicação com o serviço de autenticação: {$e->getMessage()}");
        }
    }

    /**
     * Busca detalhes completos do usuário
     */
    public function getUserDetails(int $usuarioId): ?array
    {
        $result = $this->validateUser($usuarioId);
        return $result['exists'] ? $result['data'] : null;
    }
}
