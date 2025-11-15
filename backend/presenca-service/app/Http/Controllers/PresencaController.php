<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Presenca;
use App\Models\PresencaLog;
use App\Services\EventosService;
use App\Services\InscricoesService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

class PresencaController extends Controller
{
    protected EventosService $eventosService;
    protected InscricoesService $inscricoesService;

    public function __construct(EventosService $eventosService, InscricoesService $inscricoesService)
    {
        $this->eventosService = $eventosService;
        $this->inscricoesService = $inscricoesService;
    }

    /**
     * GET /eventos/{id}/lista-presenca
     * Retorna lista de inscritos para carregar offline
     */
    public function getListaPresencaEvento(Request $request, $eventoId)
    {
        try {
            $usuarioId = $request->attributes->get('user_id');
            $token = $request->bearerToken();

            // Buscar dados do evento
            $eventoResponse = $this->eventosService->getEventDetails($eventoId);
            if (!$eventoResponse['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $eventoResponse['message']
                ], 404);
            }

            // Buscar inscrições do evento
            $inscricoesResponse = $this->inscricoesService->getInscritosPorEvento($eventoId, $token);
            if (!$inscricoesResponse['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $inscricoesResponse['message']
                ], 400);
            }

            // Buscar presenças já registradas
            $presencasExistentes = Presenca::doEvento($eventoId)
                ->pluck('inscricao_id')
                ->toArray();

            // Montar lista com status de presença
            $listaPresenca = collect($inscricoesResponse['data'])->map(function ($inscricao) use ($presencasExistentes) {
                $jaTemPresenca = in_array($inscricao['id'], $presencasExistentes);

                return [
                    'inscricao_id' => $inscricao['id'],
                    'usuario_id' => $inscricao['usuario_id'],
                    'evento_id' => $inscricao['evento_id'],
                    'nome' => $inscricao['usuario']['nome'] ?? 'Nome não disponível',
                    'email' => $inscricao['usuario']['email'] ?? 'Email não disponível',
                    'cpf' => $inscricao['usuario']['cpf'] ?? null,
                    'status_inscricao' => $inscricao['status'],
                    'ja_tem_presenca' => $jaTemPresenca,
                    'data_inscricao' => $inscricao['created_at']
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'evento' => $eventoResponse['data'],
                    'inscritos' => $listaPresenca,
                    'total_inscritos' => $listaPresenca->count(),
                    'total_presencas' => count($presencasExistentes)
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Erro crítico ao buscar lista de presença', [
                'service' => 'presenca-service',
                'evento_id' => $eventoId,
                'error' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }

    /**
     * POST /checkin
     * Registra check-in de uma pessoa
     */
    public function checkin(Request $request)
    {
        try {
            $operadorId = $request->attributes->get('user_id');

            // Validação
            $validator = Validator::make($request->all(), [
                'inscricao_id' => 'required|integer|min:1',
                'data_hora' => 'nullable|date',
                'tipo' => 'nullable|in:online,offline,qrcode',
                'evento_id' => 'required|integer|min:1'
            ]);

            if ($validator->fails()) {
                Log::warning('Validação falhou no check-in', [
                    'service' => 'presenca-service',
                    'errors' => $validator->errors()->toArray(),
                    'operador_id' => $operadorId
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $inscricaoId = $request->inscricao_id;
            $eventoId = $request->evento_id;
            $dataHora = $request->data_hora ? Carbon::parse($request->data_hora) : now();
            $origem = $request->tipo ?? 'online';

            // Log da tentativa
            PresencaLog::logTentativa($inscricaoId, $eventoId, $origem, $request->all(), $operadorId, $request->ip());

            // Verificar se já existe presença
            $presencaExistente = Presenca::where('inscricao_id', $inscricaoId)
                ->where('evento_id', $eventoId)
                ->first();

            if ($presencaExistente) {
                PresencaLog::logFalha($inscricaoId, $eventoId, $origem, 'Check-in já realizado anteriormente', $request->all(), $operadorId, $request->ip());

                return response()->json([
                    'success' => false,
                    'message' => 'Check-in já realizado para esta inscrição',
                    'data' => [
                        'presenca_existente' => [
                            'id' => $presencaExistente->id,
                            'data_hora' => $presencaExistente->data_hora,
                            'origem' => $presencaExistente->origem
                        ]
                    ]
                ], 409);
            }

            // Validar inscrição (opcional - pode ser removido para modo offline)
            if ($origem === 'online') {
                $token = $request->bearerToken();
                $inscricaoValidacao = $this->inscricoesService->validarInscricao($inscricaoId, $token);

                if (!$inscricaoValidacao['success']) {
                    PresencaLog::logFalha($inscricaoId, $eventoId, $origem, $inscricaoValidacao['message'], $request->all(), $operadorId, $request->ip());

                    return response()->json([
                        'success' => false,
                        'message' => $inscricaoValidacao['message']
                    ], 400);
                }
            }

            // Criar presença
            $presenca = Presenca::create([
                'inscricao_id' => $inscricaoId,
                'evento_id' => $eventoId,
                'data_hora' => $dataHora,
                'origem' => $origem,
                'operador_usuario_id' => $operadorId
            ]);

            // Log de sucesso
            PresencaLog::logSucesso($presenca->id, $inscricaoId, $eventoId, $origem, $request->all(), $operadorId, $request->ip());

            return response()->json([
                'success' => true,
                'message' => 'Check-in realizado com sucesso',
                'data' => [
                    'id' => $presenca->id,
                    'inscricao_id' => $presenca->inscricao_id,
                    'evento_id' => $presenca->evento_id,
                    'data_hora' => $presenca->data_hora->format('Y-m-d H:i:s'),
                    'origem' => $presenca->origem,
                    'operador_usuario_id' => $presenca->operador_usuario_id
                ]
            ], 201);

        } catch (Exception $e) {
            Log::error('Erro crítico no check-in', [
                'service' => 'presenca-service',
                'error' => $e->getMessage(),
                'request_data' => $request->all(),
                'stack_trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }

    /**
     * POST /checkin/offline-sync
     * Sincroniza check-ins offline em lote
     */
    public function offlineSync(Request $request)
    {
        try {
            $operadorId = $request->attributes->get('user_id');

            $validator = Validator::make($request->all(), [
                'checkins' => 'required|array|min:1',
                'checkins.*.inscricao_id' => 'required|integer|min:1',
                'checkins.*.evento_id' => 'required|integer|min:1',
                'checkins.*.data_hora' => 'required|date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $checkins = $request->checkins;
            $resultados = [];
            $sucessos = 0;
            $falhas = 0;

            foreach ($checkins as $checkinData) {
                try {
                    $inscricaoId = $checkinData['inscricao_id'];
                    $eventoId = $checkinData['evento_id'];
                    $dataHora = Carbon::parse($checkinData['data_hora']);

                    // Log da tentativa de sync
                    PresencaLog::create([
                        'inscricao_id' => $inscricaoId,
                        'evento_id' => $eventoId,
                        'acao' => 'sync_offline',
                        'origem' => 'offline',
                        'dados_originais' => $checkinData,
                        'operador_usuario_id' => $operadorId,
                        'ip_address' => $request->ip()
                    ]);

                    // Verificar se já existe
                    $presencaExistente = Presenca::where('inscricao_id', $inscricaoId)
                        ->where('evento_id', $eventoId)
                        ->first();

                    if ($presencaExistente) {
                        $resultados[] = [
                            'inscricao_id' => $inscricaoId,
                            'status' => 'duplicado',
                            'message' => 'Check-in já existia',
                            'presenca_id' => $presencaExistente->id
                        ];
                        continue;
                    }

                    // Criar presença
                    $presenca = Presenca::create([
                        'inscricao_id' => $inscricaoId,
                        'evento_id' => $eventoId,
                        'data_hora' => $dataHora,
                        'origem' => 'offline',
                        'operador_usuario_id' => $operadorId
                    ]);

                    $resultados[] = [
                        'inscricao_id' => $inscricaoId,
                        'status' => 'sucesso',
                        'message' => 'Check-in sincronizado',
                        'presenca_id' => $presenca->id
                    ];
                    $sucessos++;

                } catch (Exception $e) {
                    $resultados[] = [
                        'inscricao_id' => $checkinData['inscricao_id'] ?? 'unknown',
                        'status' => 'erro',
                        'message' => 'Erro ao processar: ' . $e->getMessage()
                    ];
                    $falhas++;
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Sincronização concluída: {$sucessos} sucessos, {$falhas} falhas",
                'data' => [
                    'total_processados' => count($checkins),
                    'sucessos' => $sucessos,
                    'falhas' => $falhas,
                    'resultados' => $resultados
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Erro crítico na sincronização offline', [
                'service' => 'presenca-service',
                'error' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }

    /**
     * GET /presencas/{inscricao_id}
     * Verifica se inscrito já fez check-in
     */
    public function verificarPresenca(Request $request, $inscricaoId)
    {
        try {
            // Buscar presença
            $presenca = Presenca::where('inscricao_id', $inscricaoId)->first();

            if (!$presenca) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'tem_presenca' => false,
                        'inscricao_id' => $inscricaoId
                    ]
                ], 200);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'tem_presenca' => true,
                    'inscricao_id' => $inscricaoId,
                    'presenca' => [
                        'id' => $presenca->id,
                        'evento_id' => $presenca->evento_id,
                        'data_hora' => $presenca->data_hora->format('Y-m-d H:i:s'),
                        'origem' => $presenca->origem,
                        'operador_usuario_id' => $presenca->operador_usuario_id
                    ]
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Erro crítico ao verificar presença', [
                'service' => 'presenca-service',
                'inscricao_id' => $inscricaoId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }
}
