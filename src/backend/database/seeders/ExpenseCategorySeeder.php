<?php

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use Illuminate\Database\Seeder;

class ExpenseCategorySeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            'Keamanan',
            'Kebersihan',
            'Listrik & Air',
            'Perbaikan Fasilitas',
            'Lainnya',
        ] as $name) {
            ExpenseCategory::create(['name' => $name]);
        }
    }
}
