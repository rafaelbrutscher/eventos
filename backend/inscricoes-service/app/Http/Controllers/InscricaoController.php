<?php

namespace App\Http\Controllers;

use App\Models\Inscricao;
use App\Services\AuthService;
use App\Services\EventosService;
use App\Mail\InscricaoConfirmada;
use App\Mail\InscricaoCancelada;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Exception;

class InscricaoController extends Controller
{
    protected AuthService $authService;
    protected EventosService $eventosService;

    public function __construct(AuthService $authService, EventosService $eventosService)
    {
        $this->authService = $authService;
        $this->eventosService = $eventosService;
    }

    /**
     * Lista inscrições do usuário autenticado ou por parâmetro
     * GET /inscricoes?usuario_id=123
     */
    public function index(Request $request)
    {
        try {
            $usuarioId = $request->query('usuario_id', $request->attributes->get('user_id'));
            $eventoId = $request->query('evento_id');

            $query = Inscricao::query();

            if ($eventoId) {
                // Filtro por evento - usado pelo presenca-service
                $query->where('evento_id', $eventoId);
                // Incluir apenas inscrições ativas
                $query->where('status', 'ativa');
            } else {
                // Filtro por usuário - comportamento original
                $query->where('usuario_id', $usuarioId);
            }

            $inscricoes = $query->orderBy('created_at', 'desc')->get();

            $inscricoesComDetalhes = $inscricoes->map(function ($inscricao) use ($eventoId) {
                $eventoDetails = null;
                $usuarioDetails = null;

                try {
                    $eventoDetails = $this->eventosService->getEventDetails($inscricao->evento_id);
                } catch (Exception $e) {
                    Log::warning('Falha ao buscar detalhes do evento', [
                        'service' => 'inscricoes-service',
                        'action' => 'event_details_error',
                        'evento_id' => $inscricao->evento_id,
                        'error' => $e->getMessage()
                    ]);
                }

                // Se filtrado por evento, incluir dados do usuário
                if ($eventoId) {
                    try {
                        $usuarioDetails = $this->authService->getUserDetails($inscricao->usuario_id);
                    } catch (Exception $e) {
                        Log::warning('Falha ao buscar detalhes do usuário', [
                            'service' => 'inscricoes-service',
                            'action' => 'user_details_error',
                            'usuario_id' => $inscricao->usuario_id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }

                return [
                    'id' => $inscricao->id,
                    'usuario_id' => $inscricao->usuario_id,
                    'evento_id' => $inscricao->evento_id,
                    'status' => $inscricao->status,
                    'created_at' => $inscricao->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $inscricao->updated_at->format('Y-m-d H:i:s'),
                    'evento' => $eventoDetails,
                    'usuario' => $usuarioDetails
                ];
            });



            return response()->json([
                'success' => true,
                'data' => $inscricoesComDetalhes,
                'total' => $inscricoes->count()
            ], 200);

        } catch (Exception $e) {
            Log::error('Erro ao listar inscrições', [
                'service' => 'inscricoes-service',
                'action' => 'list_inscricoes_error',
                'error' => $e->getMessage(),
                'ip' => $request->ip()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }

    /**
     * Cria uma nova inscrição
     * POST /inscricoes
     */
    public function store(Request $request)
    {
        try {
            // Se for cadastro rápido, usa o usuario_id do body, senão pega do token JWT
            if ($request->has('usuario_id') && $request->cadastro_rapido) {
                $usuarioId = $request->usuario_id;
            } else {
                // Pega o usuario_id do token JWT (inserido pelo middleware)
                $usuarioId = $request->attributes->get('user_id');
            }

            $validator = Validator::make($request->all(), [
                'evento_id' => 'required|integer|min:1',
                'usuario_id' => 'sometimes|integer|min:1', // Opcional para cadastro rápido
            ]);

            if ($validator->fails()) {
                Log::warning('Validação falhou na criação de inscrição', [
                    'service' => 'inscricoes-service',
                    'action' => 'create_inscricao_validation_failed',
                    'errors' => $validator->errors(),
                    'ip' => $request->ip()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Dados de validação falharam',
                    'errors' => $validator->errors()
                ], 422);
            }

            $eventoId = $request->evento_id;

            // Para cadastro rápido, não validamos usuário pois acabou de ser criado
            // Para inscrições normais, JWT já validou que o usuário existe

            // Valida se evento existe e está ativo
            $eventValidation = $this->eventosService->validateEvent($eventoId);
            if (!$eventValidation['exists']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Evento não encontrado'
                ], 404);
            }

            if (!$eventValidation['active']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Evento não está mais ativo para inscrições'
                ], 400);
            }

            // Verifica se já tem inscrição ativa neste evento
            if (Inscricao::hasActiveInscription($usuarioId, $eventoId)) {

                return response()->json([
                    'success' => false,
                    'message' => 'Usuário já possui inscrição ativa neste evento'
                ], 409);
            }

            // Cria a inscrição
            $inscricao = Inscricao::create([
                'usuario_id' => $usuarioId,
                'evento_id' => $eventoId,
                'status' => 'ativa'
            ]);

            // Para cadastro rápido, não enviamos email de confirmação imediatamente
            // pois o usuário ainda não completou o cadastro
            if (!$request->cadastro_rapido) {
                // Enviar email de confirmação apenas para inscrições normais
                try {
                    $usuarioDetails = $this->authService->getUserDetails($usuarioId);

                    if ($usuarioDetails && isset($usuarioDetails['email'])) {
                        Mail::to($usuarioDetails['email'])->send(new InscricaoConfirmada(
                            $inscricao->toArray(),
                            $eventValidation['data'],
                            $usuarioDetails
                        ));
                    }
                } catch (Exception $e) {
                    Log::warning('Falha ao enviar email de confirmação', [
                        'service' => 'inscricoes-service',
                        'action' => 'email_confirmacao_falha',
                        'inscricao_id' => $inscricao->id,
                        'error' => $e->getMessage()
                    ]);
                    // Não falha a inscrição por causa do email
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Inscrição realizada com sucesso',
                'data' => [
                    'id' => $inscricao->id,
                    'usuario_id' => $inscricao->usuario_id,
                    'evento_id' => $inscricao->evento_id,
                    'status' => $inscricao->status,
                    'created_at' => $inscricao->created_at->format('Y-m-d H:i:s'),
                    'evento' => $eventValidation['data']
                ]
            ], 201);

        } catch (Exception $e) {
            Log::error('Erro crítico na criação de inscrição', [
                'service' => 'inscricoes-service',
                'action' => 'create_inscricao_critical_error',
                'error' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString(),
                'ip' => $request->ip()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }

    /**
     * Mostra uma inscrição específica
     * GET /inscricoes/{id}
     */
    public function show(Request $request, string $id)
    {
        try {
            $inscricao = Inscricao::find($id);

            if (!$inscricao) {
                Log::warning('Inscrição não encontrada', [
                    'service' => 'inscricoes-service',
                    'action' => 'show_inscricao_not_found',
                    'inscricao_id' => $id
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Inscrição não encontrada'
                ], 404);
            }

            // Busca detalhes do usuário e evento
            $usuarioDetails = null;
            $eventoDetails = null;

            try {
                $usuarioDetails = $this->authService->getUserDetails($inscricao->usuario_id);
                $eventoDetails = $this->eventosService->getEventDetails($inscricao->evento_id);
            } catch (Exception $e) {
                Log::warning('Erro ao buscar detalhes complementares', [
                    'service' => 'inscricoes-service',
                    'action' => 'show_inscricao_details_error',
                    'error' => $e->getMessage()
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $inscricao->id,
                    'usuario_id' => $inscricao->usuario_id,
                    'evento_id' => $inscricao->evento_id,
                    'status' => $inscricao->status,
                    'created_at' => $inscricao->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $inscricao->updated_at->format('Y-m-d H:i:s'),
                    'usuario' => $usuarioDetails,
                    'evento' => $eventoDetails
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Erro ao buscar inscrição', [
                'service' => 'inscricoes-service',
                'action' => 'show_inscricao_error',
                'inscricao_id' => $id,
                'error' => $e->getMessage(),
                'ip' => $request->ip()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }

    /**
     * Cancela uma inscrição (soft delete via status)
     * DELETE /inscricoes/{id}
     */
    public function destroy(Request $request, string $id)
    {
        try {
            $inscricao = Inscricao::find($id);

            if (!$inscricao) {
                Log::warning('Inscrição não encontrada para cancelamento', [
                    'service' => 'inscricoes-service',
                    'action' => 'cancel_inscricao_not_found',
                    'inscricao_id' => $id
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Inscrição não encontrada'
                ], 404);
            }

            if ($inscricao->status === 'cancelada') {
                Log::warning('Tentativa de cancelar inscrição já cancelada', [
                    'service' => 'inscricoes-service',
                    'action' => 'cancel_inscricao_already_cancelled',
                    'inscricao_id' => $id
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Inscrição já foi cancelada'
                ], 400);
            }

            // Buscar detalhes antes do cancelamento
            $usuarioDetails = null;
            $eventoDetails = null;
            $statusAnterior = $inscricao->status;

            try {
                $usuarioDetails = $this->authService->getUserDetails($inscricao->usuario_id);
                $eventoDetails = $this->eventosService->getEventDetails($inscricao->evento_id);
            } catch (Exception $e) {
                Log::warning('Erro ao buscar detalhes para email de cancelamento', [
                    'service' => 'inscricoes-service',
                    'action' => 'email_cancelamento_detalhes_error',
                    'error' => $e->getMessage()
                ]);
            }

            // Cancela a inscrição
            $inscricao->cancelar();

            // Enviar email de cancelamento
            if ($usuarioDetails && $eventoDetails && isset($usuarioDetails['email'])) {
                try {
                    $inscricaoData = $inscricao->toArray();
                    $inscricaoData['status_anterior'] = $statusAnterior;

                    Mail::to($usuarioDetails['email'])->send(new InscricaoCancelada(
                        $inscricaoData,
                        $eventoDetails,
                        $usuarioDetails
                    ));

                } catch (Exception $e) {
                    Log::warning('Falha ao enviar email de cancelamento', [
                        'service' => 'inscricoes-service',
                        'action' => 'email_cancelamento_falha',
                        'inscricao_id' => $inscricao->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Inscrição cancelada com sucesso',
                'data' => [
                    'id' => $inscricao->id,
                    'status' => $inscricao->status,
                    'cancelado_em' => $inscricao->updated_at->format('Y-m-d H:i:s')
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Erro crítico no cancelamento de inscrição', [
                'service' => 'inscricoes-service',
                'action' => 'cancel_inscricao_critical_error',
                'inscricao_id' => $id,
                'error' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString(),
                'ip' => $request->ip()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }

    /**
     * Verificar se o usuário está inscrito em um evento específico
     */
    public function checkInscricao($evento_id)
    {
        try {
            // Obter ID do usuário do token JWT
            $usuarioId = auth('api')->id();

            if (!$usuarioId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Token inválido ou expirado'
                ], 401);
            }

            // Verificar se existe inscrição ativa
            $inscricao = Inscricao::where('usuario_id', $usuarioId)
                ->where('evento_id', $evento_id)
                ->where('status', 'ativa')
                ->first();

            return response()->json([
                'success' => true,
                'inscrito' => !is_null($inscricao),
                'inscricao' => $inscricao ? [
                    'id' => $inscricao->id,
                    'status' => $inscricao->status,
                    'created_at' => $inscricao->created_at
                ] : null
            ], 200);

        } catch (\Exception $e) {
            Log::error('Erro ao verificar inscrição', [
                'error' => $e->getMessage(),
                'usuario_id' => auth('api')->id() ?? 'não autenticado',
                'evento_id' => $evento_id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }
}
