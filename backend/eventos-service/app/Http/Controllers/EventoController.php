<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EventoController extends Controller
{
    /**
     * Listar todos os eventos ativos
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        try {
            Log::info('Iniciando busca de eventos ativos', [
                'service' => 'eventos-service',
                'action' => 'list_events',
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent()
            ]);

            $eventos = Event::where('data_fim', '>=', now())
                           ->orderBy('data_inicio', 'asc')
                           ->get();

            // Log da consulta de eventos bem-sucedida
            Log::info('Listagem de eventos retornada com sucesso', [
                'service' => 'eventos-service',
                'action' => 'list_events_success',
                'total_eventos' => $eventos->count(),
                'eventos_encontrados' => $eventos->pluck('nome'),
                'ip' => request()->ip()
            ]);

            return response()->json([
                'success' => true,
                'data' => $eventos->map(function ($evento) {
                    return [
                        'id' => $evento->id,
                        'nome' => $evento->nome,
                        'descricao' => $evento->descricao,
                        'data_inicio' => $evento->data_inicio->format('Y-m-d H:i:s'),
                        'data_fim' => $evento->data_fim->format('Y-m-d H:i:s'),
                        'template_certificado' => $evento->template_certificado,
                        'created_at' => $evento->created_at->format('Y-m-d H:i:s'),
                        'updated_at' => $evento->updated_at->format('Y-m-d H:i:s')
                    ];
                }),
                'total' => $eventos->count()
            ], 200);
        } catch (\Exception $e) {
            Log::error('Erro crítico ao listar eventos', [
                'service' => 'eventos-service',
                'action' => 'list_events_error',
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'stack_trace' => $e->getTraceAsString(),
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }

    /**
     * Mostrar detalhes de um evento específico
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        try {
            Log::info('Buscando detalhes do evento', [
                'service' => 'eventos-service',
                'action' => 'show_event',
                'evento_id' => $id,
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent()
            ]);

            $evento = Event::find($id);

            if (!$evento) {
                Log::warning('Evento não encontrado', [
                    'service' => 'eventos-service',
                    'action' => 'show_event_not_found',
                    'evento_id' => $id,
                    'ip' => request()->ip()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Evento não encontrado'
                ], 404);
            }

            // Log da consulta de evento específico bem-sucedida
            Log::info('Detalhes do evento retornados com sucesso', [
                'service' => 'eventos-service',
                'action' => 'show_event_success',
                'evento_id' => $id,
                'evento_nome' => $evento->nome,
                'ip' => request()->ip()
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $evento->id,
                    'nome' => $evento->nome,
                    'descricao' => $evento->descricao,
                    'data_inicio' => $evento->data_inicio->format('Y-m-d H:i:s'),
                    'data_fim' => $evento->data_fim->format('Y-m-d H:i:s'),
                    'template_certificado' => $evento->template_certificado,
                    'created_at' => $evento->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $evento->updated_at->format('Y-m-d H:i:s')
                ]
            ], 200);
        } catch (\Exception $e) {
            Log::error('Erro ao buscar evento', [
                'evento_id' => $id,
                'error' => $e->getMessage(),
                'ip' => request()->ip()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }
    }
}
