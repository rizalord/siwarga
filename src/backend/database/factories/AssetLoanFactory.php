<?php

namespace Database\Factories;

use App\Models\AssetLoan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AssetLoan>
 */
class AssetLoanFactory extends Factory
{
    protected $model = AssetLoan::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Null like Task 1's FacilityBookingFactory (facility_id/event_id):
            // BelongsTo nested factories are persisted even on make(), and the
            // assets table only arrives with the Task 4 migrations.
            'asset_id' => null,
            'borrowed_by' => User::factory(),
            'quantity' => 1,
            'status' => 'pending',
            'borrowed_at' => null,
            'returned_at' => null,
        ];
    }
}
