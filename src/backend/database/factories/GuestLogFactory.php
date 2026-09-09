<?php

namespace Database\Factories;

use App\Models\GuestLog;
use App\Models\House;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<GuestLog>
 */
class GuestLogFactory extends Factory
{
    protected $model = GuestLog::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'guest_name' => $this->faker->name(),
            'purpose' => 'Bertamu',
            'house_id' => House::factory(),
            'plate_number' => null,
            'registered_by' => User::factory(),
            'qr_token' => Str::random(32),
            'visit_date' => today(),
            'status' => GuestLog::STATUS_REGISTERED,
            'checked_in_at' => null,
            'checked_out_at' => null,
            'recorded_by' => null,
        ];
    }
}
