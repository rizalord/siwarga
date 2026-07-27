<?php

namespace Tests\Feature\Api;

use App\Models\Expense;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    public function test_can_list_expenses()
    {
        Expense::factory()->count(3)->create();

        $response = $this->getJson('/api/expenses');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_can_create_expense()
    {
        $response = $this->postJson('/api/expenses', [
            'category' => 'listrik',
            'description' => 'Tagihan listrik Januari',
            'amount' => 500000,
            'expense_date' => '2026-01-10',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.category', 'listrik');
    }

    public function test_validates_required_expense_fields()
    {
        $response = $this->postJson('/api/expenses', []);

        $response->assertStatus(422);
    }

    public function test_can_show_expense()
    {
        $expense = Expense::factory()->create();

        $response = $this->getJson("/api/expenses/{$expense->id}");

        $response->assertStatus(200);
    }

    public function test_can_update_expense()
    {
        $expense = Expense::factory()->create(['amount' => 250000]);

        $response = $this->putJson("/api/expenses/{$expense->id}", ['amount' => 300000]);

        $response->assertStatus(200)->assertJsonPath('data.amount', 300000);
    }

    public function test_can_soft_delete_expense()
    {
        $expense = Expense::factory()->create();

        $this->deleteJson("/api/expenses/{$expense->id}");

        $this->assertSoftDeleted($expense);
    }
}
