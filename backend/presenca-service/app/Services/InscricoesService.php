<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class InscricoesService
{
    private string $baseUrl;
    private string $jwtSecret;

    public function __construct()
    {
        $this->baseUrl = env('INSCRICOES_SERVICE_URL', 'http://localhost:8003');
        $this->jwtSecret = env('JWT_SECRET');
    }

    /**
     * Busca lista de inscritos para um evento
     */
    public function getInscritosPorEvento(int $eventoId, string $token)
    {
        try {
            $response = Http::timeout(15)
                ->withHeaders([
                    'Authorization' => "Bearer {$token}",
                    'Accept' => 'application/json'
                ])
                ->get("{$this->baseUrl}/api/inscricoes", [
                    'evento_id' => $eventoId
                ]);

            $data = $response->json();

            if ($response->successful() && $data['success']) {
                return [
                    'success' => true,
                    'data' => $data['data'],
                    'total' => $data['total'] ?? count($data['data'])
                ];
            }

            return [
                'success' => false,
                'message' => 'Erro ao buscar inscrições: ' . ($data['message'] ?? 'Erro desconhecido')
            ];

        } catch (Exception $e) {
            Log::error('Erro crítico ao buscar inscrições', [
                'service' => 'presenca-service',
                'evento_id' => $eventoId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Erro de comunicação com o serviço de inscrições'
            ];
        }
    }

    /**
     * Valida se uma inscrição existe e está ativa
     */
    public function validarInscricao(int $inscricaoId, string $token)
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => "Bearer {$token}",
                    'Accept' => 'application/json'
                ])
                ->get("{$this->baseUrl}/api/inscricoes/{$inscricaoId}");

            $data = $response->json();

            if ($response->successful() && $data['success']) {
                $inscricao = $data['data'];

                if ($inscricao['status'] !== 'ativa') {
                    return [
                        'success' => false,
                        'message' => 'Inscrição não está ativa'
                    ];
                }

                return [
                    'success' => true,
                    'data' => $inscricao
                ];
            }

            if ($response->status() === 404) {
                return [
                    'success' => false,
                    'message' => 'Inscrição não encontrada'
                ];
            }

            return [
                'success' => false,
                'message' => 'Erro ao validar inscrição: ' . ($data['message'] ?? 'Erro desconhecido')
            ];

        } catch (Exception $e) {
            Log::error('Erro crítico ao validar inscrição', [
                'service' => 'presenca-service',
                'inscricao_id' => $inscricaoId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Erro de comunicação com o serviço de inscrições'
            ];
        }
    }
}
