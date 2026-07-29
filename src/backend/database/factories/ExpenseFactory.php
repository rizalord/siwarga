<?php

namespace Database\Factories;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Expense>
 */
class ExpenseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => ExpenseCategory::factory(),
            'description' => fake()->sentence(),
            'amount' => fake()->randomFloat(2, 10000, 1000000),
            'expense_date' => now(),
            'created_by' => User::factory(),
        ];
    }
}
