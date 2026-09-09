<?php

namespace Database\Factories;

use App\Models\PatrolSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PatrolSchedule>
 */
class PatrolScheduleFactory extends Factory
{
    protected $model = PatrolSchedule::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'date' => today(),
            'shift' => 'malam',
            'personnel_name' => $this->faker->name(),
            'user_id' => null,
            'area' => 'Blok A',
            'note' => null,
        ];
    }
}
