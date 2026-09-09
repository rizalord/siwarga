<?php

namespace Database\Factories;

use App\Models\Bill;
use App\Models\PaymentTransaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<PaymentTransaction>
 */
class PaymentTransactionFactory extends Factory
{
    protected $model = PaymentTransaction::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'bill_id' => Bill::factory(),
            'user_id' => User::factory(),
            'provider' => 'simulator',
            'channel' => 'qris',
            'amount' => 75000,
            'status' => PaymentTransaction::STATUS_PENDING,
            'reference' => 'SIM-'.Str::upper(Str::random(10)),
            'idempotency_key' => (string) Str::uuid(),
            'pay_code' => null,
            'expires_at' => now()->addMinutes(30),
            'proof_path' => null,
            'verified_by' => null,
            'verified_at' => null,
            'rejection_reason' => null,
            'paid_at' => null,
        ];
    }
}
