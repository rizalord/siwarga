<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\EventDocumentation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EventDocumentation>
 */
class EventDocumentationFactory extends Factory
{
    protected $model = EventDocumentation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'media_type' => 'foto',
            'file_path' => 'event-documentation/'.fake()->uuid().'.jpg',
            'caption' => fake()->sentence(),
        ];
    }
}
