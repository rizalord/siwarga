<?php

namespace Database\Factories;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Ticket>
 */
class TicketFactory extends Factory
{
    protected $model = Ticket::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reported_by' => User::factory(),
            'house_id' => null,
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'category' => null,
            'status' => 'open',
            'assigned_to' => null,
        ];
    }
}
