<?php

namespace Database\Seeders;

use App\Models\House;
use Illuminate\Database\Seeder;

class HouseSeeder extends Seeder
{
    /**
     * Seed 20 houses matching the RT scenario in the PRD: 15 permanent
     * plots plus 5 contract/vacant plots. Occupancy is handled separately
     * by ResidentSeeder.
     */
    public function run(): void
    {
        for ($i = 1; $i <= 20; $i++) {
            House::create([
                'house_number' => sprintf('RT-%02d', $i),
                'address' => "Jl. Melati No. {$i}, Perumahan Griya Asri",
                'status' => 'kosong',
            ]);
        }
    }
}
