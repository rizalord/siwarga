<?php

namespace Database\Seeders;

use App\Models\DueType;
use Illuminate\Database\Seeder;

class DueTypeSeeder extends Seeder
{
    public function run(): void
    {
        DueType::create([
            'name' => 'Iuran Satpam',
            'amount' => 100000,
            'billing_cycle' => 'bulanan',
        ]);

        DueType::create([
            'name' => 'Iuran Kebersihan',
            'amount' => 15000,
            'billing_cycle' => 'bulanan',
        ]);
    }
}
