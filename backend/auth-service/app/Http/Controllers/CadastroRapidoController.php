<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Exception;
use App\Models\User;

class CadastroRapidoController extends Controller
{
    /**
     * Cadastro rápido apenas para criar usuário (sem pendências)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function cadastroRapido(Request $request)
    {
        Log::info('Iniciando cadastro rápido simples', [
            'service' => 'auth-service',
            'action' => 'cadastro_rapido_simples',
            'email' => $request->email,
            'ip' => $request->ip()
        ]);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|between:2,100',
            'email' => 'required|string|email|max:100|unique:users',
        ]);

        if($validator->fails()){
            return response()->json([
                'success' => false,
                'message' => 'Dados de validação falharam',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Criar apenas o usuário - sem pendências
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => null,
                'role' => 'participante',
                'cadastro_completo' => false,
                'cadastro_rapido_em' => now(),
            ]);

            Log::info('Cadastro rápido realizado com sucesso', [
                'service' => 'auth-service',
                'action' => 'cadastro_rapido_success',
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Usuário criado com sucesso',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role,
                        'cadastro_completo' => $user->cadastro_completo,
                    ]
                ]
            ], 201);

        } catch (Exception $e) {
            Log::error('Erro no cadastro rápido', [
                'service' => 'auth-service',
                'action' => 'cadastro_rapido_error',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao realizar cadastro rápido'
            ], 500);
        }
    }



    /**
     * Sincronização em lote de dados offline
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function sincronizarLote(Request $request)
    {
        Log::info('Iniciando sincronização em lote', [
            'service' => 'auth-service',
            'action' => 'sincronizacao_lote',
        ]);

        $validator = Validator::make($request->all(), [
            'usuarios' => 'required|array',
            'usuarios.*.name' => 'required|string|between:2,100',
            'usuarios.*.email' => 'required|string|email|max:100',
            'usuarios.*.evento_id' => 'nullable|integer',
            'usuarios.*.marcar_presenca' => 'nullable|boolean',
        ]);

        if($validator->fails()){
            return response()->json([
                'success' => false,
                'message' => 'Dados de validação falharam',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $usuarios = $request->usuarios;
            $processados = 0;
            $erros = 0;
            $resultados = [];

            // Obter token do cabeçalho Authorization
            $authHeader = $request->header('Authorization');
            $token = null;
            if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
                $token = substr($authHeader, 7);
            }

            foreach ($usuarios as $usuarioData) {
                try {
                    // 1. Verificar se usuário já existe
                    $existeUsuario = User::where('email', $usuarioData['email'])->first();

                    if ($existeUsuario) {
                        $user = $existeUsuario;
                        Log::info('Usuário já existe, usando existente', ['email' => $user->email, 'id' => $user->id]);
                    } else {
                        // Criar novo usuário
                        $user = User::create([
                            'name' => $usuarioData['name'],
                            'email' => $usuarioData['email'],
                            'password' => null,
                            'role' => 'participante',
                            'cadastro_completo' => false,
                            'cadastro_rapido_em' => now(),
                        ]);
                        Log::info('Novo usuário criado', ['email' => $user->email, 'id' => $user->id]);
                    }

                    $resultado = [
                        'usuario' => [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                        ],
                        'inscricao' => null,
                        'presenca' => null
                    ];

                    // 2. Se tem evento_id, criar inscrição
                    $inscricaoId = null;
                    if (!empty($usuarioData['evento_id']) && $token) {
                        try {
                            $inscricaoResponse = Http::timeout(30)->withHeaders([
                                'Authorization' => 'Bearer ' . $token,
                                'Content-Type' => 'application/json'
                            ])->post('http://177.44.248.89:8003/api/inscricoes', [
                                'usuario_id' => $user->id,
                                'evento_id' => $usuarioData['evento_id'],
                                'data_inscricao' => now()->format('Y-m-d H:i:s'),
                                'cadastro_rapido' => true
                            ]);

                            if ($inscricaoResponse->successful()) {
                                $inscricaoData = $inscricaoResponse->json();
                                $resultado['inscricao'] = $inscricaoData['data'] ?? 'Criada com sucesso';
                                // Guardar ID da inscrição para usar na presença
                                $inscricaoId = $inscricaoData['data']['id'] ?? null;
                                Log::info('Inscrição criada', ['usuario_id' => $user->id, 'evento_id' => $usuarioData['evento_id'], 'inscricao_id' => $inscricaoId]);
                            } else {
                                Log::warning('Falha ao criar inscrição', [
                                    'usuario_id' => $user->id,
                                    'evento_id' => $usuarioData['evento_id'],
                                    'response' => $inscricaoResponse->body()
                                ]);
                                $inscricaoId = null;
                            }
                        } catch (Exception $e) {
                            Log::error('Erro ao criar inscrição', ['error' => $e->getMessage()]);
                        }

                        // 3. Se deve marcar presença, apenas indicar para fazer check-in depois
                        if (!empty($usuarioData['marcar_presenca']) && isset($inscricaoId) && $inscricaoId) {
                            $resultado['presenca'] = [
                                'status' => 'pendente_checkin',
                                'message' => 'Inscrito cadastrado. Fazer check-in pela tela de Check-in.',
                                'inscricao_id' => $inscricaoId
                            ];
                            Log::info('Cadastro marcado para check-in posterior', [
                                'usuario_id' => $user->id,
                                'evento_id' => $usuarioData['evento_id'],
                                'inscricao_id' => $inscricaoId
                            ]);
                        }
                    }

                    $resultados[] = $resultado;
                    $processados++;

                } catch (Exception $e) {
                    $erros++;
                    Log::error('Erro ao processar usuário', [
                        'email' => $usuarioData['email'] ?? 'desconhecido',
                        'error' => $e->getMessage()
                    ]);
                    $resultados[] = [
                        'erro' => 'Erro ao processar: ' . $e->getMessage(),
                        'dados' => $usuarioData
                    ];
                }
            }

            Log::info('Sincronização em lote concluída', [
                'service' => 'auth-service',
                'action' => 'sincronizacao_lote_concluida',
                'total' => count($usuarios),
                'processados' => $processados,
                'erros' => $erros
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sincronização concluída',
                'data' => [
                    'total' => count($usuarios),
                    'processados' => $processados,
                    'erros' => $erros,
                    'resultados' => $resultados
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Erro na sincronização em lote', [
                'service' => 'auth-service',
                'action' => 'sincronizacao_lote_error',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao executar sincronização em lote: ' . $e->getMessage()
            ], 500);
        }
    }
}
