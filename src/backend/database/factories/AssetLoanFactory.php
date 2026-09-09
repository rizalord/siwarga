<?php

namespace Database\Factories;

use App\Models\Asset;
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
            'asset_id' => Asset::factory(),
            'borrowed_by' => User::factory(),
            'quantity' => 1,
            'status' => 'pending',
            'borrowed_at' => null,
            'returned_at' => null,
        ];
    }
}
