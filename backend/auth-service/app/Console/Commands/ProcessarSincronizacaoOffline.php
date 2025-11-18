<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class ProcessarSincronizacaoOffline extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sincronizacao:processar {--limit=10 : Número máximo de registros a processar}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Processa pendências de sincronização de cadastros rápidos offline';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $limit = $this->option('limit');

        $this->info("Iniciando processamento de sincronização offline (limite: $limit)");

        $pendencias = DB::table('pendencias_sincronizacao')
            ->where('processado', false)
            ->orderBy('created_at', 'asc')
            ->limit($limit)
            ->get();

        if ($pendencias->isEmpty()) {
            $this->info('Nenhuma pendência encontrada para sincronização.');
            return 0;
        }

        $processados = 0;
        $erros = 0;

        foreach ($pendencias as $pendencia) {
            try {
                $this->info("Processando pendência ID {$pendencia->id} - Tipo: {$pendencia->tipo}");

                if ($this->processarPendencia($pendencia)) {
                    $processados++;
                    $this->info("✓ Pendência {$pendencia->id} processada com sucesso");
                } else {
                    $erros++;
                    $this->error("✗ Erro ao processar pendência {$pendencia->id}");
                }
            } catch (Exception $e) {
                $erros++;
                $this->error("✗ Exceção ao processar pendência {$pendencia->id}: {$e->getMessage()}");

                // Registrar erro na base de dados
                DB::table('pendencias_sincronizacao')
                    ->where('id', $pendencia->id)
                    ->update([
                        'erro_sincronizacao' => $e->getMessage(),
                        'updated_at' => now()
                    ]);
            }
        }

        $this->info("Processamento concluído: $processados processados, $erros erros");
        return 0;
    }

    private function processarPendencia($pendencia): bool
    {
        $dados = json_decode($pendencia->dados, true);

        if ($pendencia->tipo === 'cadastro_rapido_offline') {
            return $this->processarCadastroRapido($pendencia, $dados);
        }

        return false;
    }

    private function processarCadastroRapido($pendencia, $dados): bool
    {
        try {
            // Obter token de sistema para autenticação
            $systemToken = $this->gerarTokenSistema();

            // 1. Criar inscrição no serviço de inscrições
            $inscricaoResponse = Http::timeout(30)->withHeaders([
                'Authorization' => 'Bearer ' . $systemToken,
                'Content-Type' => 'application/json'
            ])->post('http://177.44.248.89:8003/api/inscricoes', [
                'usuario_id' => $pendencia->usuario_id,
                'evento_id' => $pendencia->evento_id,
                'cadastro_rapido' => true
            ]);

            if (!$inscricaoResponse->successful()) {
                Log::error('Erro na sincronização de inscrição', [
                    'pendencia_id' => $pendencia->id,
                    'response' => $inscricaoResponse->body()
                ]);
                return false;
            }

            // 2. Marcar presença se necessário
            if ($pendencia->marcar_presenca) {
                $inscricaoData = $inscricaoResponse->json();
                $inscricaoId = $inscricaoData['data']['id'] ?? null;

                if ($inscricaoId) {
                    $presencaResponse = Http::timeout(30)->withHeaders([
                        'Authorization' => 'Bearer ' . $systemToken,
                        'Content-Type' => 'application/json'
                    ])->post('http://177.44.248.89:8004/api/check-in', [
                        'inscricao_id' => $inscricaoId,
                        'data_hora' => $dados['created_at'] ?? now()->format('Y-m-d H:i:s'),
                        'origem' => 'offline'
                    ]);

                    if (!$presencaResponse->successful()) {
                        Log::warning('Erro na sincronização de presença', [
                            'pendencia_id' => $pendencia->id,
                            'inscricao_id' => $inscricaoId,
                            'response' => $presencaResponse->body()
                        ]);
                        // Não falha a sincronização por causa da presença
                    } else {
                        Log::info('Presença sincronizada com sucesso', [
                            'pendencia_id' => $pendencia->id,
                            'inscricao_id' => $inscricaoId,
                            'evento_id' => $pendencia->evento_id
                        ]);
                    }
                } else {
                    Log::warning('ID da inscrição não encontrado para marcar presença', [
                        'pendencia_id' => $pendencia->id,
                        'inscricao_response' => $inscricaoResponse->body()
                    ]);
                }
            }

            // 3. Marcar como processado
            DB::table('pendencias_sincronizacao')
                ->where('id', $pendencia->id)
                ->update([
                    'processado' => true,
                    'processado_em' => now(),
                    'updated_at' => now()
                ]);

            Log::info('Sincronização de cadastro rápido concluída', [
                'pendencia_id' => $pendencia->id,
                'usuario_id' => $pendencia->usuario_id,
                'evento_id' => $pendencia->evento_id
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Exceção durante sincronização de cadastro rápido', [
                'pendencia_id' => $pendencia->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    private function gerarTokenSistema(): string
    {
        // Criar token para usuário admin/sistema para sincronização
        $admin = \App\Models\User::where('role', 'admin')->first();

        if (!$admin) {
            throw new Exception('Nenhum usuário admin encontrado para gerar token de sistema');
        }

        $token = \PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth::fromUser($admin);
        return $token;
    }
}
