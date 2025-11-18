<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Criar usuários de teste com diferentes roles
        User::factory()->create([
            'name' => 'Administrador',
            'email' => 'admin@test.com',
            'role' => 'admin',
            'password' => bcrypt('password')
        ]);

        User::factory()->create([
            'name' => 'Atendente Teste',
            'email' => 'atendente@test.com',
            'role' => 'atendente',
            'password' => bcrypt('password')
        ]);

        User::factory()->create([
            'name' => 'Participante Teste',
            'email' => 'participante@test.com',
            'role' => 'participante',
            'password' => bcrypt('password')
        ]);
    }
}
