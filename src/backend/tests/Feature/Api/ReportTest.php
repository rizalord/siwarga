<?php

namespace Tests\Feature\Api;

use App\Models\Bill;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->user = User::factory()->create();
        $this->user->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->user->load('roles.permissions');
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
        $response->assertJsonStructure([
            'data' => [
                'year',
                'year_balance',
                'monthly_data' => [
                    '*' => ['month', 'total_income', 'total_expense', 'balance'],
                ],
            ],
        ]);
        $this->assertCount(12, $response->json('data.monthly_data'));
    }

    public function test_yearly_summary_returns_correct_monthly_totals()
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
        $monthly = collect($response->json('data.monthly_data'));
        $january = $monthly->firstWhere('month', 1);

        $this->assertEquals(300000, $january['total_income']);
        $this->assertEquals(100000, $january['total_expense']);
        $this->assertEquals(200000, $january['balance']);
        $this->assertEquals(200000, $response->json('data.year_balance'));

        // Other months should be untouched.
        $february = $monthly->firstWhere('month', 2);
        $this->assertEquals(0, $february['total_income']);
        $this->assertEquals(0, $february['total_expense']);
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
