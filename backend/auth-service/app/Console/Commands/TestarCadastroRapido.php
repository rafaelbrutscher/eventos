<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class TestarCadastroRapido extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:cadastro-rapido';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Testa o cadastro rápido offline';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('=== Testando Cadastro Rápido Offline ===');

        try {
            // 1. Criar usuário
            $user = User::create([
                'name' => 'Teste Offline ' . time(),
                'email' => 'teste.offline.' . time() . '@exemplo.com',
                'password' => null,
                'role' => 'participante',
                'cadastro_completo' => false,
                'cadastro_rapido_em' => now(),
            ]);

            $this->info("✅ Usuário criado: ID {$user->id}, Nome: {$user->name}");

            // 2. Criar pendência de sincronização
            $pendencia = [
                'usuario_id' => $user->id,
                'evento_id' => 1, // Assumindo que existe evento ID 1
                'marcar_presenca' => true,
                'tipo' => 'cadastro_rapido_offline',
                'dados' => json_encode([
                    'usuario' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role
                    ],
                    'evento_id' => 1,
                    'marcar_presenca' => true,
                    'created_at' => now()->toISOString()
                ]),
                'processado' => false,
                'created_at' => now(),
                'updated_at' => now()
            ];

            DB::table('pendencias_sincronizacao')->insert($pendencia);
            $this->info("✅ Pendência de sincronização criada para evento ID 1");

            // 3. Listar pendências não processadas
            $pendencias = DB::table('pendencias_sincronizacao')->where('processado', false)->count();
            $this->info("📋 Total de pendências não processadas: {$pendencias}");

            $this->info('=== Teste Concluído com Sucesso ===');

        } catch (\Exception $e) {
            $this->error("❌ Erro no teste: {$e->getMessage()}");
        }
    }
}
