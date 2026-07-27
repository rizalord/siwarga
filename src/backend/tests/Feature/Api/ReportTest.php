<?php

namespace Tests\Feature\Api;

use App\Models\Bill;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    public function test_can_get_yearly_summary()
    {
        $bill = Bill::factory()->create(['amount_due' => 200000]);
        Payment::factory()->create([
            'bill_id' => $bill->id,
            'amount_paid' => 200000,
            'payment_date' => '2026-01-15',
        ]);
        Expense::factory()->create([
            'amount' => 100000,
            'expense_date' => '2026-01-15',
        ]);

        $response = $this->getJson('/api/reports/summary/2026');

        $response->assertStatus(200);
        $response->assertJsonStructure(['data' => ['year', 'total_income', 'total_expense', 'balance']]);
    }

    public function test_yearly_summary_returns_correct_totals()
    {
        $bill = Bill::factory()->create(['amount_due' => 300000]);
        Payment::factory()->create([
            'bill_id' => $bill->id,
            'amount_paid' => 300000,
            'payment_date' => '2026-01-15',
        ]);
        Expense::factory()->create([
            'amount' => 100000,
            'expense_date' => '2026-01-10',
        ]);

        $response = $this->getJson('/api/reports/summary/2026');

        $response->assertStatus(200);
        $response->assertJsonPath('data.total_income', 300000);
        $response->assertJsonPath('data.total_expense', 100000);
        $response->assertJsonPath('data.balance', 200000);
    }

    public function test_can_get_monthly_report()
    {
        $bill = Bill::factory()->create(['amount_due' => 200000]);
        Payment::factory()->create([
            'bill_id' => $bill->id,
            'amount_paid' => 200000,
            'payment_date' => '2026-01-15',
        ]);
        Expense::factory()->create([
            'amount' => 50000,
            'expense_date' => '2026-01-10',
        ]);

        $response = $this->getJson('/api/reports/monthly/2026/1');

        $response->assertStatus(200);
        $response->assertJsonStructure(['data' => [
            'year', 'month', 'total_income', 'total_expense', 'balance',
        ]]);
    }
}
