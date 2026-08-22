<?php

namespace Database\Factories;

use App\Models\Announcement;
use App\Models\AnnouncementTarget;
use App\Models\House;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AnnouncementTarget>
 */
class AnnouncementTargetFactory extends Factory
{
    protected $model = AnnouncementTarget::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'announcement_id' => Announcement::factory(),
            'house_id' => House::factory(),
        ];
    }
}
