<?php

namespace Database\Factories;

use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AnnouncementRead>
 */
class AnnouncementReadFactory extends Factory
{
    protected $model = AnnouncementRead::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'announcement_id' => Announcement::factory(),
            'user_id' => User::factory(),
            'read_at' => now(),
        ];
    }
}
