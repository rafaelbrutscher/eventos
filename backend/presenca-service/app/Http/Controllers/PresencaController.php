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

            // Gerar certificado automaticamente após check-in
            Log::info('=== INICIANDO GERAÇÃO AUTOMÁTICA DE CERTIFICADO ===', [
                'inscricao_id' => $inscricaoId,
                'evento_id' => $eventoId,
                'timestamp' => now()->toDateTimeString(),
                'function' => 'checkin'
            ]);

            try {
                $this->gerarCertificadoAutomatico($inscricaoId, $eventoId, $request->bearerToken());
            } catch (Exception $e) {
                Log::warning('Falha ao gerar certificado automático', [
                    'service' => 'presenca-service',
                    'action' => 'certificado_automatico_falha',
                    'presenca_id' => $presenca->id,
                    'inscricao_id' => $inscricaoId,
                    'evento_id' => $eventoId,
                    'error' => $e->getMessage()
                ]);
                // Não falha o check-in por causa do certificado
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

                    // Gerar certificado automaticamente para sync offline também
                    try {
                        $this->gerarCertificadoAutomatico($inscricaoId, $eventoId, $request->bearerToken());
                    } catch (Exception $e) {
                        Log::warning('Falha ao gerar certificado automático na sincronização', [
                            'presenca_id' => $presenca->id,
                            'inscricao_id' => $inscricaoId,
                            'evento_id' => $eventoId,
                            'error' => $e->getMessage()
                        ]);
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
                'user_id' => $userId,
                'total_presencas' => $presencas->count(),
                'presencas_ids' => $presencas->pluck('id')->toArray()
            ]);

            return response()->json([
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

            // Tentar gerar certificado com diferentes URLs (comunicação entre containers)
            $urls = [
                'http://eventos_certificados:8000/api/gerar-certificado', // Nome do container + porta interna
                'http://177.44.248.89:8005/api/gerar-certificado'        // IP externo como fallback
            ];

            $response = null;
            $lastError = null;

            foreach ($urls as $url) {
                try {
                    Log::info("Tentando gerar certificado na URL: {$url}");
                    $response = Http::timeout(30)->post($url, [
                        'user_id' => $userId,
                        'evento_id' => $eventoId
                    ]);

                    if ($response->successful()) {
                        Log::info("Certificado gerado com sucesso na URL: {$url}");
                        break; // Sai do loop se funcionou
                    }
                } catch (Exception $urlException) {
                    $lastError = $urlException;
                    Log::warning("Falha na URL {$url}: " . $urlException->getMessage());
                    continue;
                }
            }

            if (!$response || !$response->successful()) {
                throw new Exception('Falha em todas as URLs para gerar certificado. Último erro: ' . ($lastError ? $lastError->getMessage() : 'Nenhuma resposta válida'));
            }

            if ($response->successful()) {
                $responseData = $response->json();

                Log::info('Certificado gerado automaticamente', [
                    'service' => 'presenca-service',
                    'action' => 'certificado_automatico_gerado',
                    'inscricao_id' => $inscricaoId,
                    'evento_id' => $eventoId,
                    'user_id' => $userId,
                    'certificado_id' => $responseData['data']['id'] ?? null
                ]);
            } else {
                Log::warning('Falha ao gerar certificado automático - resposta não bem-sucedida', [
                    'inscricao_id' => $inscricaoId,
                    'evento_id' => $eventoId,
                    'user_id' => $userId,
                    'status_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
            }

        } catch (Exception $e) {
            Log::error('Erro ao gerar certificado automático', [
                'inscricao_id' => $inscricaoId,
                'evento_id' => $eventoId,
                'error' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Sincroniza cadastros offline completos (usuário + inscrição + presença)
     */
    public function sincronizarCadastrosOffline(Request $request)
    {
        try {
            $validated = $request->validate([
                'cadastros' => 'required|array',
                'cadastros.*.usuario' => 'required|array',
                'cadastros.*.usuario.name' => 'required|string',
                'cadastros.*.usuario.email' => 'required|email',
                'cadastros.*.inscricao' => 'required|array',
                'cadastros.*.inscricao.evento_id' => 'required|integer',
                'cadastros.*.presenca' => 'required|array',
                'cadastros.*.presenca.data_hora' => 'required|string'
            ]);

            $resultados = [];
            $sucessos = 0;
            $falhas = 0;

            foreach ($validated['cadastros'] as $cadastro) {
                try {
                    Log::info('Processando cadastro offline:', $cadastro['usuario']);

                    // 1. Criar usuário
                    $responseUsuario = Http::withToken($request->bearerToken())
                        ->timeout(10)
                        ->post('http://177.44.248.89:8001/api/cadastro-rapido', [
                            'name' => $cadastro['usuario']['name'],
                            'email' => $cadastro['usuario']['email'],
                        ]);

                    if (!$responseUsuario->successful()) {
                        throw new Exception('Falha ao criar usuário: ' . $responseUsuario->body());
                    }

                    $dadosUsuario = $responseUsuario->json();
                    $usuarioId = $dadosUsuario['data']['user']['id'];

                    // 2. Criar inscrição
                    $responseInscricao = Http::withToken($request->bearerToken())
                        ->timeout(10)
                        ->post('http://177.44.248.89:8003/api/inscricoes', [
                            'usuario_id' => $usuarioId,
                            'evento_id' => $cadastro['inscricao']['evento_id'],
                            'status_inscricao' => 'confirmado'
                        ]);

                    if (!$responseInscricao->successful()) {
                        throw new Exception('Falha ao criar inscrição: ' . $responseInscricao->body());
                    }

                    $dadosInscricao = $responseInscricao->json();
                    $inscricaoId = $dadosInscricao['data']['id'];

                    // 3. Criar presença
                    $presenca = Presenca::create([
                        'inscricao_id' => $inscricaoId,
                        'evento_id' => $cadastro['inscricao']['evento_id'],
                        'data_hora' => $cadastro['presenca']['data_hora'],
                        'origem' => 'cadastro_rapido_sync',
                        'operador_usuario_id' => $request->user()->id
                    ]);

                    // 4. Gerar certificado automático
                    $this->gerarCertificadoAutomatico($inscricaoId, $cadastro['inscricao']['evento_id'], $request->bearerToken());

                    $sucessos++;
                    $resultados[] = [
                        'nome' => $cadastro['usuario']['name'],
                        'email' => $cadastro['usuario']['email'],
                        'status' => 'sucesso',
                        'usuario_id' => $usuarioId,
                        'inscricao_id' => $inscricaoId,
                        'presenca_id' => $presenca->id
                    ];

                    Log::info('Cadastro sincronizado com sucesso:', [
                        'nome' => $cadastro['usuario']['name'],
                        'usuario_id' => $usuarioId,
                        'inscricao_id' => $inscricaoId
                    ]);

                } catch (Exception $e) {
                    $falhas++;
                    $resultados[] = [
                        'nome' => $cadastro['usuario']['name'],
                        'email' => $cadastro['usuario']['email'],
                        'status' => 'erro',
                        'erro' => $e->getMessage()
                    ];

                    Log::error('Erro ao sincronizar cadastro:', [
                        'nome' => $cadastro['usuario']['name'],
                        'error' => $e->getMessage()
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Sincronização concluída: {$sucessos} sucessos, {$falhas} falhas",
                'data' => [
                    'total_processados' => count($validated['cadastros']),
                    'sucessos' => $sucessos,
                    'falhas' => $falhas,
                    'resultados' => $resultados
                ]
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dados de entrada inválidos',
                'errors' => $e->errors()
            ], 422);

        } catch (Exception $e) {
            Log::error('Erro na sincronização de cadastros offline:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor: ' . $e->getMessage()
            ], 500);
        }
    }
}
