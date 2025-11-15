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
        $this->baseUrl = config('app.eventos_service_url', env('EVENTOS_SERVICE_URL', 'http://127.0.0.1:8002'));
    }

    /**
     * Valida se um evento existe e está ativo
     */
    public function validateEvent(int $eventoId): array
    {
        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/api/eventos/{$eventoId}");

            if ($response->successful()) {
                $data = $response->json();

                // Verifica se o evento ainda está ativo (data_fim no futuro)
                $dataFim = $data['data']['data_fim'] ?? null;
                $isActive = $dataFim ? strtotime($dataFim) > time() : false;

                return [
                    'exists' => true,
                    'active' => $isActive,
                    'data' => $data['data'] ?? null
                ];
            }

            if ($response->status() === 404) {
                Log::warning('Evento não encontrado', [
                    'service' => 'inscricoes-service',
                    'action' => 'validate_event_not_found',
                    'evento_id' => $eventoId
                ]);

                return ['exists' => false, 'active' => false, 'data' => null];
            }

            Log::error('Erro na validação do evento', [
                'service' => 'inscricoes-service',
                'action' => 'validate_event_error',
                'evento_id' => $eventoId,
                'status_code' => $response->status(),
                'response' => $response->body()
            ]);

            throw new Exception("Erro ao validar evento: HTTP {$response->status()}");

        } catch (Exception $e) {
            Log::error('Falha crítica na validação do evento', [
                'service' => 'inscricoes-service',
                'action' => 'validate_event_critical_error',
                'evento_id' => $eventoId,
                'error' => $e->getMessage()
            ]);

            throw new Exception("Falha na comunicação com o serviço de eventos: {$e->getMessage()}");
        }
    }

    /**
     * Busca detalhes completos do evento
     */
    public function getEventDetails(int $eventoId): ?array
    {
        $result = $this->validateEvent($eventoId);
        return $result['exists'] ? $result['data'] : null;
    }
}
