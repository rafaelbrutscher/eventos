<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Presenca;
use App\Models\PresencaLog;
use App\Services\EventosService;
use App\Services\InscricoesService;
use App\Services\AuthService;
use App\Mail\ParticipacaoConfirmada;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use Exception;

class PresencaController extends Controller
{
    protected EventosService $eventosService;
    protected InscricoesService $inscricoesService;
    protected AuthService $authService;

    public function __construct(EventosService $eventosService, InscricoesService $inscricoesService, AuthService $authService)
    {
        $this->eventosService = $eventosService;
        $this->inscricoesService = $inscricoesService;
        $this->authService = $authService;
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
                    'nome' => $inscricao['usuario']['name'] ?? 'Nome não disponível',
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

            // Validar inscrição (opcional - pular validação para cadastros rápidos)
            if ($origem === 'online' && !$request->input('cadastro_rapido', false)) {
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

            // Enviar email de participação confirmada
            try {
                $token = $request->bearerToken();

                // Buscar dados da inscrição e do usuário
                $inscricaoResponse = $this->inscricoesService->validarInscricao($inscricaoId, $token);
                $eventoResponse = $this->eventosService->getEventDetails($eventoId);

                if ($inscricaoResponse['success'] && $eventoResponse && $eventoResponse['success']) {
                    // Buscar dados do usuário diretamente do auth-service
                    $usuarioDetails = $this->authService->getUserDetails($inscricaoResponse['data']['usuario_id']);

                    if ($usuarioDetails && isset($usuarioDetails['email'])) {
                        Mail::to($usuarioDetails['email'])->send(new ParticipacaoConfirmada(
                            $presenca->toArray(),
                            $eventoResponse['data'],
                            $usuarioDetails
                        ));

                        Log::info('Email de participação enviado', [
                            'service' => 'presenca-service',
                            'action' => 'email_participacao_enviado',
                            'presenca_id' => $presenca->id,
                            'email' => $usuarioDetails['email']
                        ]);
                    }
                }
            } catch (Exception $e) {
                Log::warning('Falha ao enviar email de participação', [
                    'service' => 'presenca-service',
                    'action' => 'email_participacao_falha',
                    'presenca_id' => $presenca->id,
                    'error' => $e->getMessage()
                ]);
                // Não falha o check-in por causa do email
            }

            // 🎯 TENTAR GERAR CERTIFICADO AUTOMÁTICO (100% NÃO-BLOQUEANTE)
            Log::info('🎯 Iniciando geração automática de certificado', [
                'service' => 'presenca-service',
                'action' => 'tentativa_certificado_automatico',
                'inscricao_id' => $inscricaoId,
                'evento_id' => $eventoId,
                'origem' => $origem,
                'observacao' => 'Processo não-bloqueante - check-in já foi concluído com sucesso'
            ]);

            try {
                // Timeout máximo de 15 segundos para toda a operação de certificado
                set_time_limit(15);
                $this->gerarCertificadoAutomatico($inscricaoId, $eventoId, $request->bearerToken());
            } catch (Exception $e) {
                Log::info('🚨 Certificado automático falhou - CHECK-IN REALIZADO COM SUCESSO', [
                    'service' => 'presenca-service',
                    'action' => 'certificado_automatico_falhou',
                    'inscricao_id' => $inscricaoId,
                    'evento_id' => $eventoId,
                    'origem' => $origem,
                    'error_type' => get_class($e),
                    'error_message' => $e->getMessage(),
                    'resultado' => 'CHECK-IN FOI CONCLUÍDO - certificado pode ser gerado manualmente depois'
                ]);
                // NUNCA lança exceção - o check-in é sempre válido
            }

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
                ],
                'certificado' => [
                    'status' => 'processando_automaticamente',
                    'observacao' => 'Certificado será gerado automaticamente em segundo plano'
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

                    // Tentar gerar certificado (não-bloqueante)
                    try {
                        $this->gerarCertificadoAutomatico($inscricaoId, $eventoId, $request->bearerToken());
                    } catch (Exception $e) {
                        Log::info('Certificado será gerado posteriormente para sincronização offline', [
                            'presenca_id' => $presenca->id,
                            'inscricao_id' => $inscricaoId,
                            'evento_id' => $eventoId
                        ]);
                        // Não impede a sincronização
                    }

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

    /**
     * GET /eventos/{evento_id}/presencas
     * Busca todas as presenças de um evento (para certificados-service)
     */
    public function getPresencasPorEvento(Request $request, $eventoId)
    {
        try {
            // Buscar presenças do evento com join na tabela inscricoes para obter usuario_id
            $presencas = DB::table('presencas')
                ->join('inscricoes', 'presencas.inscricao_id', '=', 'inscricoes.id')
                ->where('presencas.evento_id', $eventoId)
                ->select(
                    'presencas.id',
                    'presencas.inscricao_id',
                    'presencas.evento_id',
                    'inscricoes.usuario_id',
                    'presencas.data_hora',
                    'presencas.origem'
                )
                ->get()
                ->map(function ($presenca) {
                    return [
                        'id' => $presenca->id,
                        'inscricao_id' => $presenca->inscricao_id,
                        'evento_id' => $presenca->evento_id,
                        'usuario_id' => $presenca->usuario_id,
                        'data_hora' => $presenca->data_hora,
                        'origem' => $presenca->origem,
                        'status' => 'confirmado'
                    ];
                });

        Log::info('Presenças encontradas:', [
            'evento_id' => $eventoId,
            'total_presencas' => $presencas->count(),
            'presencas_ids' => $presencas->pluck('id')->toArray()
        ]);            return response()->json([
                'success' => true,
                'data' => $presencas,
                'total' => $presencas->count()
            ]);

        } catch (Exception $e) {
            Log::error('Erro ao buscar presenças do evento', [
                'service' => 'presenca-service',
                'evento_id' => $eventoId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }

    /**
     * GET /presencas/usuario/{user_id}
     * Busca todas as presenças de um usuário (para certificados-service)
     */
    public function getPresencasPorUsuario(Request $request, $userId)
    {
        Log::info('=== BUSCANDO PRESENÇAS POR USUÁRIO ===', [
            'user_id' => $userId,
            'timestamp' => now()->toDateTimeString(),
            'ip' => $request->ip()
        ]);

        try {
            // Buscar presenças do usuário com join na tabela inscricoes
            $presencas = DB::table('presencas')
                ->join('inscricoes', 'presencas.inscricao_id', '=', 'inscricoes.id')
                ->where('inscricoes.usuario_id', $userId)
                ->select(
                    'presencas.id',
                    'presencas.inscricao_id',
                    'presencas.evento_id',
                    'inscricoes.usuario_id',
                    'presencas.data_hora',
                    'presencas.origem'
                )
                ->get()
                ->map(function ($presenca) {
                    return [
                        'id' => $presenca->id,
                        'inscricao_id' => $presenca->inscricao_id,
                        'evento_id' => $presenca->evento_id,
                        'usuario_id' => $presenca->usuario_id,
                        'data_hora' => $presenca->data_hora,
                        'origem' => $presenca->origem,
                        'status' => 'confirmado'
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $presencas,
                'total' => $presencas->count()
            ], 200);

        } catch (Exception $e) {
            Log::error('Erro ao buscar presenças do usuário', [
                'service' => 'presenca-service',
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }

    /**
     * Gera certificado automaticamente após check-in
     */
    private function gerarCertificadoAutomatico($inscricaoId, $eventoId, $token)
    {
        Log::info('=== EXECUTANDO gerarCertificadoAutomatico ===', [
            'inscricao_id' => $inscricaoId,
            'evento_id' => $eventoId,
            'has_token' => !empty($token),
            'timestamp' => now()->toDateTimeString()
        ]);

        try {
            // Buscar dados da inscrição para obter o user_id
            Log::info('Validando inscrição...', ['inscricao_id' => $inscricaoId]);
            $inscricaoResponse = $this->inscricoesService->validarInscricao($inscricaoId, $token);

            if (!$inscricaoResponse['success']) {
                Log::warning('Não foi possível validar inscrição para certificado automático', [
                    'inscricao_id' => $inscricaoId,
                    'evento_id' => $eventoId
                ]);
                return;
            }

            $userId = $inscricaoResponse['data']['usuario_id'];

            // Chamar o serviço de certificados para gerar certificado
            Log::info('Tentando gerar certificado automático...', [
                'user_id' => $userId,
                'evento_id' => $eventoId,
                'inscricao_id' => $inscricaoId
            ]);

            $urls = [
                // Prioridade 1: Container Docker interno (mais rápido)
                'http://eventos_certificados:8000/api/gerar-certificado',
                'http://eventos_certificados:8000/api/gerar-certificado/',

                // Prioridade 2: Nomes alternativos do container
                'http://certificados-service:8000/api/gerar-certificado',
                'http://certificados:8000/api/gerar-certificado',

                // Prioridade 3: Localhost (fallback local)
                'http://127.0.0.1:8005/api/gerar-certificado',
                'http://localhost:8005/api/gerar-certificado',

                // Prioridade 4: IP externo (mais lento, último recurso)
                'http://177.44.248.89:8005/api/gerar-certificado',
                'http://177.44.248.89:8005/api/gerar-certificado/'
            ];

            $response = null;
            $lastError = null;

            foreach ($urls as $url) {
                try {
                    Log::info("=== TENTANDO GERAR CERTIFICADO ===", [
                        'url' => $url,
                        'user_id' => $userId,
                        'evento_id' => $eventoId,
                        'inscricao_id' => $inscricaoId,
                        'payload' => ['user_id' => $userId, 'evento_id' => $eventoId]
                    ]);

                    // Timeout progressivo: menos tempo para URLs Docker, mais para externos
                    $timeout = (strpos($url, 'eventos_certificados') !== false || strpos($url, 'certificados') !== false) ? 3 : 8;

                    Log::info("🔄 Tentativa de certificado", [
                        'url' => $url,
                        'timeout' => $timeout,
                        'user_id' => $userId,
                        'evento_id' => $eventoId
                    ]);

                    $response = Http::timeout($timeout)
                        ->retry(2, 100)  // 2 tentativas com 100ms entre elas
                        ->withHeaders([
                            'Content-Type' => 'application/json',
                            'Accept' => 'application/json',
                            'X-Requested-With' => 'XMLHttpRequest'
                        ])
                        ->withOptions([
                            'verify' => false,  // Ignora SSL em desenvolvimento
                            'http_errors' => false  // Não lança exceção em HTTP 4xx/5xx
                        ])
                        ->post($url, [
                            'user_id' => $userId,
                            'evento_id' => $eventoId
                        ]);                    // LOGGING ULTRA DETALHADO DA RESPOSTA
                    $responseBody = $response->body();
                    $responseData = null;

                    try {
                        $responseData = $response->json();
                    } catch (Exception $jsonException) {
                        Log::warning("⚠️ Resposta não é JSON válido", [
                            'url' => $url,
                            'body_preview' => substr($responseBody, 0, 200)
                        ]);
                    }

                    Log::info("💬 RESPOSTA DETALHADA RECEBIDA", [
                        'url' => $url,
                        'status_code' => $response->status(),
                        'successful' => $response->successful(),
                        'response_size' => strlen($responseBody),
                        'content_type' => $response->header('Content-Type'),
                        'response_data' => $responseData,
                        'response_body_preview' => substr($responseBody, 0, 500)
                    ]);

                    if ($response->successful() && $responseData && isset($responseData['success']) && $responseData['success']) {
                        Log::info("✅ CERTIFICADO GERADO COM SUCESSO TOTAL!", [
                            'url' => $url,
                            'user_id' => $userId,
                            'evento_id' => $eventoId,
                            'certificado_id' => $responseData['data']['id'] ?? 'N/A',
                            'codigo_certificado' => $responseData['data']['codigo'] ?? 'N/A',
                            'participante' => $responseData['data']['participante_nome'] ?? 'N/A'
                        ]);
                        break; // SUCESSO! Sai do loop
                    } else {
                        $errorDetails = [
                            'url' => $url,
                            'status_code' => $response->status(),
                            'is_successful' => $response->successful(),
                            'response_has_success' => isset($responseData['success']),
                            'response_success_value' => $responseData['success'] ?? 'N/A',
                            'response_message' => $responseData['message'] ?? 'N/A',
                            'full_response' => $responseData
                        ];

                        if ($response->status() >= 500) {
                            Log::error("🔥 ERRO DE SERVIDOR (5xx)", $errorDetails);
                        } elseif ($response->status() >= 400) {
                            Log::warning("⚠️ ERRO DE CLIENTE (4xx)", $errorDetails);
                        } else {
                            Log::warning("❌ Resposta inesperada", $errorDetails);
                        }
                    }
                } catch (Exception $urlException) {
                    $lastError = $urlException;

                    $errorType = get_class($urlException);
                    $isTimeoutError = (strpos($urlException->getMessage(), 'timeout') !== false ||
                                     strpos($urlException->getMessage(), 'Connection timed out') !== false);
                    $isConnectionError = (strpos($urlException->getMessage(), 'Connection') !== false);

                    Log::error("🔥 EXCEÇÃO DETALHADA na URL {$url}", [
                        'exception_type' => $errorType,
                        'exception_message' => $urlException->getMessage(),
                        'is_timeout' => $isTimeoutError,
                        'is_connection_error' => $isConnectionError,
                        'user_id' => $userId,
                        'evento_id' => $eventoId,
                        'timeout_usado' => $timeout,
                        'url_tentativa' => $url,
                        'file' => $urlException->getFile(),
                        'line' => $urlException->getLine()
                    ]);

                    // Se for timeout em URLs Docker, tentar próxima URL mais rapidamente
                    if ($isTimeoutError && strpos($url, 'eventos_certificados') !== false) {
                        Log::info('⏩ Timeout em container Docker - tentando próxima URL rapidamente');
                    }

                    continue; // Tenta próxima URL
                }
            }

            // AVALIAÇÃO FINAL - NUNCA QUEBRA O CHECK-IN
            if (!$response || !$response->successful()) {
                Log::warning('🚨 CERTIFICADO NÃO GERADO - CHECK-IN CONTINUA NORMAL', [
                    'inscricao_id' => $inscricaoId,
                    'evento_id' => $eventoId,
                    'user_id' => $userId,
                    'urls_tentadas' => count($urls),
                    'last_error_type' => $lastError ? get_class($lastError) : 'Sem erro específico',
                    'last_error_message' => $lastError ? $lastError->getMessage() : 'Nenhuma resposta válida',
                    'last_response_status' => $response ? $response->status() : 'Sem resposta',
                    'motivo' => 'Serviço temporáriamente indisponível - certificado pode ser gerado manualmente depois'
                ]);

                return;
            }

            try {
                $responseData = $response->json();

                Log::info('🎆 CERTIFICADO GERADO AUTOMATICAMENTE COM SUCESSO TOTAL!', [
                    'service' => 'presenca-service',
                    'action' => 'certificado_automatico_gerado',
                    'inscricao_id' => $inscricaoId,
                    'evento_id' => $eventoId,
                    'user_id' => $userId,
                    'certificado_id' => $responseData['data']['id'] ?? 'N/A',
                    'codigo_certificado' => $responseData['data']['codigo'] ?? 'N/A',
                    'participante_nome' => $responseData['data']['participante_nome'] ?? 'N/A',
                    'response_status' => $response->status(),
                    'url_sucesso' => $response->effectiveUri() ?? 'N/A'
                ]);
            } catch (Exception $jsonEx) {
                Log::warning('Certificado gerado mas resposta não é JSON válido', [
                    'response_body' => substr($response->body(), 0, 200),
                    'status' => $response->status()
                ]);
            }        } catch (Exception $e) {
            // ERRO CRÍTICO - MAS CHECK-IN JÁ FOI REALIZADO
            Log::error('🔥 ERRO CRÍTICO na geração automática de certificado', [
                'service' => 'presenca-service',
                'action' => 'erro_critico_certificado_automatico',
                'inscricao_id' => $inscricaoId,
                'evento_id' => $eventoId,
                'error_type' => get_class($e),
                'error_message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'observacao' => 'CHECK-IN FOI REALIZADO COM SUCESSO - apenas o certificado automático falhou'
            ]);

            // IMPORTANTE: NÃO lança exceção - o check-in já foi concluído com sucesso
        }
    }

    /**
     * Sincroniza cadastros offline completos (usuário + inscrição + presença)
     */
    public function sincronizarCadastrosOffline(Request $request)
    {
        try {
            Log::info('🔄 INICIANDO SINCRONIZAÇÃO DE CADASTROS OFFLINE', [
                'service' => 'presenca-service',
                'action' => 'sincronizar_cadastros_offline',
                'request_data' => $request->all(),
                'user_id' => $request->user()->id ?? 'N/A'
            ]);

            // Validação com mais flexibilidade
            $validated = $request->validate([
                'cadastros' => 'required|array|min:1',
                'cadastros.*.usuario' => 'required|array',
                'cadastros.*.usuario.name' => 'required|string|max:255',
                'cadastros.*.usuario.email' => 'required|email|max:255',
                'cadastros.*.inscricao' => 'required|array',
                'cadastros.*.inscricao.evento_id' => 'required|integer|min:1',
                'cadastros.*.presenca' => 'required|array',
                'cadastros.*.presenca.data_hora' => 'required|string'
            ]);

            Log::info('📋 DADOS VALIDADOS COM SUCESSO', [
                'total_cadastros' => count($validated['cadastros']),
                'primeiro_cadastro_exemplo' => $validated['cadastros'][0] ?? 'N/A'
            ]);

            $resultados = [];
            $sucessos = 0;
            $falhas = 0;

            foreach ($validated['cadastros'] as $index => $cadastro) {
                try {
                    Log::info('👤 PROCESSANDO CADASTRO OFFLINE', [
                        'indice' => $index + 1,
                        'total' => count($validated['cadastros']),
                        'usuario_nome' => $cadastro['usuario']['name'],
                        'usuario_email' => $cadastro['usuario']['email'],
                        'evento_id' => $cadastro['inscricao']['evento_id']
                    ]);

                    // 1. Criar usuário com múltiplas URLs de fallback
                    $urlsAuth = [
                        'http://eventos_auth:8000/api/cadastro-rapido',
                        'http://127.0.0.1:8001/api/cadastro-rapido',
                        'http://177.44.248.89:8001/api/cadastro-rapido'
                    ];

                    $responseUsuario = null;
                    $lastAuthError = null;

                    foreach ($urlsAuth as $authUrl) {
                        try {
                            Log::info('🔗 TENTANDO CRIAR USUÁRIO', ['url' => $authUrl]);

                            $responseUsuario = Http::withToken($request->bearerToken())
                                ->timeout(8)
                                ->retry(2, 100)
                                ->post($authUrl, [
                                    'name' => $cadastro['usuario']['name'],
                                    'email' => $cadastro['usuario']['email'],
                                ]);

                            if ($responseUsuario->successful()) {
                                Log::info('USUÁRIO CRIADO COM SUCESSO', ['url' => $authUrl]);
                                break;
                            } else {
                                Log::warning('❌ Falha na URL', [
                                    'url' => $authUrl,
                                    'status' => $responseUsuario->status(),
                                    'body' => substr($responseUsuario->body(), 0, 200)
                                ]);
                            }
                        } catch (Exception $e) {
                            $lastAuthError = $e;
                            Log::error('EXCEÇÃO na criação de usuário', [
                                'url' => $authUrl,
                                'error' => $e->getMessage()
                            ]);
                            continue;
                        }
                    }

                    if (!$responseUsuario || !$responseUsuario->successful()) {
                        throw new Exception('Falha ao criar usuário em todas as URLs. Último erro: ' . ($lastAuthError ? $lastAuthError->getMessage() : $responseUsuario->body()));
                    }

                    $dadosUsuario = $responseUsuario->json();
                    $usuarioId = $dadosUsuario['data']['user']['id'] ?? null;

                    if (!$usuarioId) {
                        throw new Exception('ID do usuário não retornado na resposta: ' . json_encode($dadosUsuario));
                    }

                    Log::info('👤 USUÁRIO CRIADO', ['usuario_id' => $usuarioId]);

                    // 2. Criar inscrição com múltiplas URLs
                    $urlsInscricoes = [
                        'http://eventos_inscricoes:8000/api/inscricoes',
                        'http://127.0.0.1:8003/api/inscricoes',
                        'http://177.44.248.89:8003/api/inscricoes'
                    ];

                    $responseInscricao = null;
                    $lastInscricaoError = null;

                    foreach ($urlsInscricoes as $inscricaoUrl) {
                        try {
                            Log::info('TENTANDO CRIAR INSCRIÇÃO', ['url' => $inscricaoUrl]);

                            $responseInscricao = Http::withToken($request->bearerToken())
                                ->timeout(8)
                                ->retry(2, 100)
                                ->post($inscricaoUrl, [
                                    'usuario_id' => $usuarioId,
                                    'evento_id' => $cadastro['inscricao']['evento_id'],
                                    'status_inscricao' => 'confirmado'
                                ]);

                            if ($responseInscricao->successful()) {
                                Log::info('INSCRIÇÃO CRIADA COM SUCESSO', ['url' => $inscricaoUrl]);
                                break;
                            } else {
                                Log::warning('Falha na URL de inscrição', [
                                    'url' => $inscricaoUrl,
                                    'status' => $responseInscricao->status(),
                                    'body' => substr($responseInscricao->body(), 0, 200)
                                ]);
                            }
                        } catch (Exception $e) {
                            $lastInscricaoError = $e;
                            Log::error('EXCEÇÃO na criação de inscrição', [
                                'url' => $inscricaoUrl,
                                'error' => $e->getMessage()
                            ]);
                            continue;
                        }
                    }

                    if (!$responseInscricao || !$responseInscricao->successful()) {
                        throw new Exception('Falha ao criar inscrição em todas as URLs. Último erro: ' . ($lastInscricaoError ? $lastInscricaoError->getMessage() : $responseInscricao->body()));
                    }

                    $dadosInscricao = $responseInscricao->json();
                    $inscricaoId = $dadosInscricao['data']['id'] ?? null;

                    if (!$inscricaoId) {
                        throw new Exception('ID da inscrição não retornado na resposta: ' . json_encode($dadosInscricao));
                    }

                    Log::info('📝 INSCRIÇÃO CRIADA', ['inscricao_id' => $inscricaoId]);

                    // 3. Criar presença
                    $dataHora = $cadastro['presenca']['data_hora'];

                    // Converter data/hora se necessário
                    if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $dataHora)) {
                        try {
                            $dataHora = date('Y-m-d H:i:s', strtotime($dataHora));
                        } catch (Exception $e) {
                            $dataHora = date('Y-m-d H:i:s'); // Usar agora se não conseguir converter
                            Log::warning('Data/hora inválida, usando timestamp atual', [
                                'data_original' => $cadastro['presenca']['data_hora'],
                                'data_convertida' => $dataHora
                            ]);
                        }
                    }

                    $presenca = Presenca::create([
                        'inscricao_id' => $inscricaoId,
                        'evento_id' => $cadastro['inscricao']['evento_id'],
                        'data_hora' => $dataHora,
                        'origem' => 'cadastro_rapido_sync',
                        'operador_usuario_id' => $request->user()->id ?? 1
                    ]);

                    Log::info('✅ PRESENÇA CRIADA', ['presenca_id' => $presenca->id]);

                    // 4. Tentar gerar certificado (100% não-bloqueante)
                    try {
                        Log::info('TENTANDO GERAR CERTIFICADO AUTOMÁTICO');
                        $this->gerarCertificadoAutomatico($inscricaoId, $cadastro['inscricao']['evento_id'], $request->bearerToken());
                        Log::info('CERTIFICADO GERADO OU PROCESSADO');
                    } catch (Exception $e) {
                        Log::info('CERTIFICADO SERÁ GERADO POSTERIORMENTE', [
                            'inscricao_id' => $inscricaoId,
                            'evento_id' => $cadastro['inscricao']['evento_id'],
                            'usuario_nome' => $cadastro['usuario']['name'],
                            'motivo' => $e->getMessage()
                        ]);
                        // Sincronização continua normalmente - certificado é opcional
                    }

                    $sucessos++;
                    $resultados[] = [
                        'nome' => $cadastro['usuario']['name'],
                        'email' => $cadastro['usuario']['email'],
                        'status' => 'sucesso',
                        'usuario_id' => $usuarioId,
                        'inscricao_id' => $inscricaoId,
                        'presenca_id' => $presenca->id,
                        'data_sincronizacao' => now()->toISOString()
                    ];

                    Log::info('🎉 CADASTRO SINCRONIZADO COM SUCESSO TOTAL!', [
                        'indice' => $index + 1,
                        'nome' => $cadastro['usuario']['name'],
                        'email' => $cadastro['usuario']['email'],
                        'usuario_id' => $usuarioId,
                        'inscricao_id' => $inscricaoId,
                        'presenca_id' => $presenca->id,
                        'evento_id' => $cadastro['inscricao']['evento_id']
                    ]);

                } catch (Exception $e) {
                    $falhas++;
                    $resultados[] = [
                        'nome' => $cadastro['usuario']['name'] ?? 'N/A',
                        'email' => $cadastro['usuario']['email'] ?? 'N/A',
                        'status' => 'erro',
                        'erro' => $e->getMessage(),
                        'erro_detalhado' => [
                            'tipo' => get_class($e),
                            'arquivo' => $e->getFile(),
                            'linha' => $e->getLine(),
                            'stack_trace' => $e->getTraceAsString()
                        ],
                        'data_erro' => now()->toISOString()
                    ];

                    Log::error('💥 ERRO DETALHADO AO SINCRONIZAR CADASTRO', [
                        'indice' => $index + 1,
                        'nome' => $cadastro['usuario']['name'] ?? 'N/A',
                        'email' => $cadastro['usuario']['email'] ?? 'N/A',
                        'evento_id' => $cadastro['inscricao']['evento_id'] ?? 'N/A',
                        'error_type' => get_class($e),
                        'error_message' => $e->getMessage(),
                        'error_file' => $e->getFile(),
                        'error_line' => $e->getLine(),
                        'cadastro_completo' => $cadastro
                    ]);
                }
            }

            Log::info('🎆 SINCRONIZAÇÃO DE CADASTROS CONCLUÍDA', [
                'total_processados' => count($validated['cadastros']),
                'sucessos' => $sucessos,
                'falhas' => $falhas,
                'percentual_sucesso' => round(($sucessos / count($validated['cadastros'])) * 100, 2) . '%'
            ]);

            return response()->json([
                'success' => $sucessos > 0, // Considera sucesso se pelo menos um foi sincronizado
                'message' => "Sincronização concluída: {$sucessos} sucessos, {$falhas} falhas de " . count($validated['cadastros']) . " cadastros",
                'data' => [
                    'total_processados' => count($validated['cadastros']),
                    'sucessos' => $sucessos,
                    'falhas' => $falhas,
                    'percentual_sucesso' => round(($sucessos / count($validated['cadastros'])) * 100, 2),
                    'resultados' => $resultados,
                    'timestamp' => now()->toISOString(),
                    'processado_por' => $request->user()->name ?? 'Sistema'
                ]
            ]);

        } catch (ValidationException $e) {
            Log::error('❌ ERRO DE VALIDAÇÃO na sincronização de cadastros', [
                'validation_errors' => $e->errors(),
                'request_data' => $request->all(),
                'user_id' => $request->user()->id ?? 'N/A'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Dados de entrada inválidos para sincronização',
                'errors' => $e->errors(),
                'debug_info' => [
                    'total_cadastros_enviados' => is_array($request->input('cadastros')) ? count($request->input('cadastros')) : 0,
                    'estrutura_esperada' => [
                        'cadastros' => [
                            'usuario' => ['name' => 'string', 'email' => 'email'],
                            'inscricao' => ['evento_id' => 'integer'],
                            'presenca' => ['data_hora' => 'datetime string']
                        ]
                    ]
                ]
            ], 422);

        } catch (Exception $e) {
            Log::error('ERRO CRÍTICO na sincronização de cadastros offline', [
                'error_type' => get_class($e),
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'request_data' => $request->all(),
                'user_id' => $request->user()->id ?? 'N/A',
                'stack_trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro crítico na sincronização de cadastros offline',
                'error' => $e->getMessage(),
                'debug_info' => [
                    'error_type' => get_class($e),
                    'timestamp' => now()->toISOString(),
                    'suporte' => 'Verifique os logs do servidor para mais detalhes'
                ]
            ], 500);
        }
    }
}
