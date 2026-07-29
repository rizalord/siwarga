<?php

namespace Database\Seeders;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ExpenseSeeder extends Seeder
{
    /**
     * Requires UserSeeder and ExpenseCategorySeeder to have run first.
     */
    public function run(): void
    {
        $admin = User::where('email', 'admin@siwarga.test')->first();

        $items = [
            ['category' => 'Keamanan', 'description' => 'Gaji satpam bulanan'],
            ['category' => 'Kebersihan', 'description' => 'Upah petugas kebersihan'],
            ['category' => 'Listrik & Air', 'description' => 'Token listrik pos satpam'],
            ['category' => 'Perbaikan Fasilitas', 'description' => 'Perbaikan jalan berlubang'],
            ['category' => 'Lainnya', 'description' => 'Alat tulis kantor RT'],
        ];

        $categoryIds = ExpenseCategory::pluck('id', 'name');

        $now = Carbon::now();
        foreach ([2, 1, 0] as $monthsAgo) {
            $period = $now->copy()->subMonths($monthsAgo);
            foreach ($items as $item) {
                Expense::create([
                    'category_id' => $categoryIds[$item['category']],
                    'description' => $item['description'],
                    'amount' => fake()->randomFloat(2, 50000, 1500000),
                    'expense_date' => $period->copy()->day(random_int(1, 25)),
                    'created_by' => $admin?->id,
                ]);
            }
        }
    }
}
