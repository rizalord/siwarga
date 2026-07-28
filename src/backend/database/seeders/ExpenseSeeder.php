<?php

namespace Database\Seeders;

use App\Models\Expense;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ExpenseSeeder extends Seeder
{
    /**
     * Requires UserSeeder to have run first.
     */
    public function run(): void
    {
        $admin = User::where('email', 'admin@siwarga.test')->first();

        $categories = [
            ['category' => 'keamanan', 'description' => 'Gaji satpam bulanan'],
            ['category' => 'kebersihan', 'description' => 'Upah petugas kebersihan'],
            ['category' => 'listrik', 'description' => 'Token listrik pos satpam'],
            ['category' => 'perbaikan', 'description' => 'Perbaikan jalan berlubang'],
            ['category' => 'lainnya', 'description' => 'Alat tulis kantor RT'],
        ];

        $now = Carbon::now();
        foreach ([2, 1, 0] as $monthsAgo) {
            $period = $now->copy()->subMonths($monthsAgo);
            foreach ($categories as $item) {
                Expense::create([
                    'category' => $item['category'],
                    'description' => $item['description'],
                    'amount' => fake()->randomFloat(2, 50000, 1500000),
                    'expense_date' => $period->copy()->day(random_int(1, 25)),
                    'created_by' => $admin?->id,
                ]);
            }
        }
    }
}
