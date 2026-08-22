<?php

namespace Database\Factories;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Announcement>
 */
class AnnouncementFactory extends Factory
{
    protected $model = Announcement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'slug' => fake()->unique()->slug(3),
            'content' => '<p>'.fake()->paragraph().'</p>',
            'category' => fake()->randomElement(['darurat', 'umum', 'kegiatan', 'keuangan']),
            'is_public' => false,
            'published_at' => now(),
            'created_by' => User::factory(),
        ];
    }
}
