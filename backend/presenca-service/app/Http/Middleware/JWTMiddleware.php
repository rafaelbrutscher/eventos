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
            // Extrai e valida o token JWT
            $user = JWTAuth::parseToken()->authenticate();

            if (!$user) {
                Log::warning('Token válido mas user_id não encontrado no payload', [
                    'service' => 'presenca-service',
                    'ip' => $request->ip(),
                    'route' => $request->route()?->getName()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Usuário não encontrado'
                ], 401);
            }

            // Adiciona o user_id nos atributos da request para uso posterior
            $request->attributes->add(['user_id' => $user->id]);

        } catch (TokenExpiredException $e) {
            Log::warning('Token JWT expirado', [
                'service' => 'presenca-service',
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
                'service' => 'presenca-service',
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
                'service' => 'presenca-service',
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
