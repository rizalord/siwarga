<?php

namespace Database\Factories;

use App\Models\Facility;
use App\Models\FacilityBooking;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FacilityBooking>
 */
class FacilityBookingFactory extends Factory
{
    protected $model = FacilityBooking::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'facility_id' => Facility::factory(),
            'booked_by' => User::factory(),
            'event_id' => null,
            'start_at' => now()->addDay(),
            'end_at' => now()->addDay()->addHours(2),
            'status' => 'pending',
            'approved_by' => null,
        ];
    }
}
