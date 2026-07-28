<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\BillGenerationService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class BillSeeder extends Seeder
{
    /**
     * Requires DueTypeSeeder, HouseSeeder, ResidentSeeder, and UserSeeder to have run first.
     */
    public function run(): void
    {
        $service = new BillGenerationService;
        $admin = User::where('email', 'admin@siwarga.test')->first();

        $now = Carbon::now();
        foreach ([2, 1, 0] as $monthsAgo) {
            $period = $now->copy()->subMonths($monthsAgo);
            $service->generate($period->month, $period->year, $admin?->id);
        }
    }
}
