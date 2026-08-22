<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    protected $model = Event::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'slug' => fake()->unique()->slug(3),
            'description' => fake()->paragraph(),
            'starts_at' => fake()->dateTimeBetween('now', '+1 month'),
            'ends_at' => null,
            'status' => 'upcoming',
            'is_public' => true,
            'created_by' => User::factory(),
        ];
    }
}
