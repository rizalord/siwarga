<?php

namespace Database\Factories;

use App\Models\House;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<House>
 */
class HouseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'house_number' => fake()->unique()->numerify('RT-###'),
            'address' => fake()->address(),
            'status' => fake()->randomElement(['dihuni', 'kosong']),
        ];
    }
}
