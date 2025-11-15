<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class EventosService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = env('EVENTOS_SERVICE_URL', 'http://localhost:8002');
    }

    /**
     * Busca detalhes de um evento
     */
    public function getEventDetails(int $eventoId)
    {
        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/api/eventos/{$eventoId}");
            $data = $response->json();

            if ($response->successful() && $data['success']) {
                return [
                    'success' => true,
                    'data' => $data['data']
                ];
            }

            if ($response->status() === 404) {
                Log::warning('Evento não encontrado', [
                    'service' => 'presenca-service',
                    'evento_id' => $eventoId,
                    'response_status' => $response->status()
                ]);

                return [
                    'success' => false,
                    'message' => 'Evento não encontrado'
                ];
            }

            return [
                'success' => false,
                'message' => 'Erro ao buscar evento: ' . ($data['message'] ?? 'Erro desconhecido')
            ];

        } catch (Exception $e) {
            Log::error('Erro crítico ao buscar evento', [
                'service' => 'presenca-service',
                'evento_id' => $eventoId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Erro de comunicação com o serviço de eventos'
            ];
        }
    }
}
