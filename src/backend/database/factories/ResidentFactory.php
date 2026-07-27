<?php

namespace Database\Factories;

use App\Models\Resident;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Resident>
 */
class ResidentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'full_name' => fake()->name(),
            'status' => fake()->randomElement(['kontrak', 'tetap']),
            'phone_number' => fake()->phoneNumber(),
            'marital_status' => fake()->randomElement(['menikah', 'belum_menikah']),
        ];
    }
}
