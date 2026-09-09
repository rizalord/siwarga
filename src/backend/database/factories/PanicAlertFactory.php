<?php

namespace Database\Factories;

use App\Models\PanicAlert;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PanicAlert>
 */
class PanicAlertFactory extends Factory
{
    protected $model = PanicAlert::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reporter_id' => User::factory(),
            'house_id' => null,
            'location_note' => null,
            'note' => 'Butuh bantuan',
            'status' => PanicAlert::STATUS_ACTIVE,
            'handler_id' => null,
            'handled_at' => null,
            'resolved_at' => null,
        ];
    }
}
