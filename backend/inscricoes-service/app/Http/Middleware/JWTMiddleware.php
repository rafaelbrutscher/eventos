<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenExpiredException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException;
use Illuminate\Support\Facades\Log;

class JWTMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            // Valida o token JWT e extrai o payload
            $token = JWTAuth::parseToken();
            $payload = $token->getPayload();

            // Extrai o user_id do token sem buscar no banco local
            $userId = $payload->get('sub');

            // Converte para inteiro se for string
            if ($userId && is_string($userId)) {
                $userId = (int) $userId;
            }

            if (!$userId) {
                Log::warning('Token válido mas user_id não encontrado no payload', [
                    'service' => 'inscricoes-service',
                    'action' => 'jwt_user_id_missing',
                    'ip' => $request->ip(),
                    'route' => $request->route()?->getName()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'User ID não encontrado no token'
                ], 401);
            }

            // Adiciona apenas o user_id ao request (sem buscar dados no banco local)
            $request->attributes->set('user_id', $userId);

            Log::info('Autenticação JWT bem-sucedida', [
                'service' => 'inscricoes-service',
                'action' => 'jwt_auth_success',
                'user_id' => $userId,
                'ip' => $request->ip(),
                'route' => $request->route()?->getName()
            ]);

        } catch (TokenExpiredException $e) {
            Log::warning('Token JWT expirado', [
                'service' => 'inscricoes-service',
                'action' => 'jwt_token_expired',
                'ip' => $request->ip(),
                'route' => $request->route()?->getName(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Token expirado'
            ], 401);

        } catch (TokenInvalidException $e) {
            Log::warning('Token JWT inválido', [
                'service' => 'inscricoes-service',
                'action' => 'jwt_token_invalid',
                'ip' => $request->ip(),
                'route' => $request->route()?->getName(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Token inválido'
            ], 401);

        } catch (JWTException $e) {
            Log::warning('Token JWT não fornecido ou malformado', [
                'service' => 'inscricoes-service',
                'action' => 'jwt_token_missing',
                'ip' => $request->ip(),
                'route' => $request->route()?->getName(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Token de autorização necessário'
            ], 401);
        }

        return $next($request);
    }
}
