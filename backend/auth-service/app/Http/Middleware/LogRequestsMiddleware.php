<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;

class LogRequestsMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Log da requisição recebida
        Log::info('Requisição recebida - Auth Service', [
            'service' => 'auth-service',
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'route' => $request->route()?->getName() ?? 'undefined',
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'headers' => $this->getLogSafeHeaders($request),
            'body' => $this->getLogSafeBody($request),
            'timestamp' => now()->toDateTimeString()
        ]);

        $startTime = microtime(true);
        $response = $next($request);
        $executionTime = round((microtime(true) - $startTime) * 1000, 2);

        // Log da resposta enviada
        Log::info('Resposta enviada - Auth Service', [
            'service' => 'auth-service',
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'route' => $request->route()?->getName() ?? 'undefined',
            'ip' => $request->ip(),
            'status_code' => $response->getStatusCode(),
            'response_size' => strlen($response->getContent()),
            'execution_time_ms' => $executionTime,
            'timestamp' => now()->toDateTimeString()
        ]);

        return $response;
    }

    /**
     * Obtém o corpo da requisição de forma segura (remove senhas)
     */
    private function getLogSafeBody(Request $request): array
    {
        $body = $request->all();

        // Remove campos sensíveis do log
        $sensitiveFields = ['password', 'password_confirmation', 'token', 'secret'];

        foreach ($sensitiveFields as $field) {
            if (isset($body[$field])) {
                $body[$field] = '***HIDDEN***';
            }
        }

        return $body;
    }

    /**
     * Obtém headers seguros para log (remove tokens de autorização)
     */
    private function getLogSafeHeaders(Request $request): array
    {
        $headers = $request->headers->all();

        // Oculta tokens de autorização
        if (isset($headers['authorization'])) {
            $headers['authorization'] = ['Bearer ***TOKEN***'];
        }

        return $headers;
    }
}
