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
        // Log da requisição recebida (formato compacto)
        Log::info(sprintf(
            '[AUTH-SERVICE] → %s %s | IP: %s | Body: %s',
            $request->method(),
            $request->getPathInfo(),
            $request->ip(),
            json_encode($this->getLogSafeBody($request))
        ));

        $startTime = microtime(true);
        $response = $next($request);
        $executionTime = round((microtime(true) - $startTime) * 1000, 2);

        // Log da resposta enviada (formato compacto)
        Log::info(sprintf(
            '[AUTH-SERVICE] ← %s %s | Status: %d | %sms | Size: %s bytes',
            $request->method(),
            $request->getPathInfo(),
            $response->getStatusCode(),
            $executionTime,
            number_format(strlen($response->getContent()))
        ));

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
