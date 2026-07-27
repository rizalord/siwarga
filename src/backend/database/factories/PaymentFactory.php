<?php

namespace Database\Factories;

use App\Models\Bill;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'bill_id' => Bill::factory(),
            'amount_paid' => fake()->randomFloat(2, 50000, 500000),
            'payment_date' => now(),
            'notes' => fake()->sentence(),
            'created_by' => User::factory(),
        ];
    }
}
