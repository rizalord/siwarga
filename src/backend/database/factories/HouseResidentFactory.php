<?php

namespace Database\Factories;

use App\Models\House;
use App\Models\HouseResident;
use App\Models\Resident;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HouseResident>
 */
class HouseResidentFactory extends Factory
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
            'start_date' => fake()->date(),
        ];
    }
}
