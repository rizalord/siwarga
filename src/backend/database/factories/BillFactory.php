<?php

namespace Database\Factories;

use App\Models\Bill;
use App\Models\DueType;
use App\Models\House;
use App\Models\Resident;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Bill>
 */
class BillFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'house_id' => House::factory(),
            'resident_id' => Resident::factory(),
            'due_type_id' => DueType::factory(),
            'period_start' => now()->startOfMonth(),
            'period_end' => now()->endOfMonth(),
            'amount_due' => fake()->randomFloat(2, 50000, 500000),
            'status' => 'belum_lunas',
            'generated_at' => now(),
        ];
    }
}
