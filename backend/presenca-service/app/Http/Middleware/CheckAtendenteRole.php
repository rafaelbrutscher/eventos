<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Facades\Log;

class CheckAtendenteRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            // Obtém o payload do JWT
            $payload = JWTAuth::parseToken()->getPayload();

            // Verifica se o role está presente no payload
            $role = $payload->get('role');

            if (!$role) {
                Log::warning('Token JWT sem informação de role', [
                    'service' => 'presenca-service',
                    'ip' => $request->ip(),
                    'route' => $request->route()?->getName()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Token inválido - informação de role ausente'
                ], 401);
            }

            // Verifica se o role permite fazer check-in (atendente ou admin)
            if (!in_array($role, ['atendente', 'admin'])) {
                Log::warning('Tentativa de acesso negada - role insuficiente', [
                    'service' => 'presenca-service',
                    'role' => $role,
                    'ip' => $request->ip(),
                    'route' => $request->route()?->getName(),
                    'user_id' => $request->attributes->get('user_id')
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Acesso não permitido - apenas atendentes podem fazer check-in'
                ], 403);
            }

            // Adiciona role nos atributos da request para uso posterior
            $request->attributes->add(['user_role' => $role]);

        } catch (\Exception $e) {
            Log::error('Erro ao verificar role no middleware', [
                'service' => 'presenca-service',
                'error' => $e->getMessage(),
                'ip' => $request->ip()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno do servidor'
            ], 500);
        }

        return $next($request);
    }
}
