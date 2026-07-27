<?php

namespace Database\Factories;

use App\Models\DueType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DueType>
 */
class DueTypeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->word(),
            'amount' => fake()->randomFloat(2, 50000, 500000),
            'billing_cycle' => fake()->randomElement(['bulanan', 'fleksibel']),
        ];
    }
}
