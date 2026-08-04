<?php

namespace Tests\Feature\Api;

use App\Models\Bill;
use App\Models\DueType;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\House;
use App\Models\Payment;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $bendahara;

    private User $warga;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create(['name' => 'Admin']);
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);

        $this->bendahara = User::factory()->create(['name' => 'Bendahara']);
        $this->bendahara->roles()->attach(Role::where('name', 'bendahara')->first()->id);

        $this->warga = User::factory()->create(['name' => 'Warga']);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
    }

    public function test_warga_cannot_create_resident(): void
    {
        $response = $this->actingAs($this->warga)
            ->postJson('/api/residents', [
                'full_name' => 'Test',
                'status' => 'tetap',
                'phone_number' => '08123456789',
                'marital_status' => 'menikah',
            ]);

        $response->assertStatus(403);
    }

    public function test_warga_cannot_create_due_type(): void
    {
        $response = $this->actingAs($this->warga)
            ->postJson('/api/due-types', [
                'name' => 'Test',
                'amount' => 10000,
                'billing_cycle' => 'bulanan',
            ]);

        $response->assertStatus(403);
    }

    public function test_warga_cannot_create_expense_category(): void
    {
        $response = $this->actingAs($this->warga)
            ->postJson('/api/expense-categories', [
                'name' => 'Test',
            ]);

        $response->assertStatus(403);
    }

    public function test_bendahara_can_manage_expense_categories(): void
    {
        $response = $this->actingAs($this->bendahara)
            ->postJson('/api/expense-categories', [
                'name' => 'Test',
            ]);

        $response->assertStatus(201);
    }

    public function test_bendahara_can_restore_expense_categories(): void
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Test']);
        $category->delete();

        $response = $this->actingAs($this->bendahara)
            ->postJson("/api/expense-categories/{$category->id}/restore");

        $response->assertStatus(200);
    }

    public function test_bendahara_receives_financial_trash_permissions(): void
    {
        $this->assertFalse($this->bendahara->hasPermission('residents.trash'));
        $this->assertFalse($this->bendahara->hasPermission('houses.trash'));
        $this->assertFalse($this->bendahara->hasPermission('due-types.trash'));
        $this->assertTrue($this->bendahara->hasPermission('bills.trash'));
        $this->assertTrue($this->bendahara->hasPermission('payments.trash'));
        $this->assertTrue($this->bendahara->hasPermission('expenses.trash'));
        $this->assertTrue($this->bendahara->hasPermission('expense-categories.trash'));
        $this->assertFalse($this->bendahara->hasPermission('users.trash'));
    }

    public function test_bendahara_cannot_manage_users(): void
    {
        $response = $this->actingAs($this->bendahara)
            ->getJson('/api/users');

        $response->assertStatus(403);
    }

    public function test_bendahara_can_view_but_cannot_manage_houses(): void
    {
        $house = House::factory()->create();

        $this->actingAs($this->bendahara)
            ->getJson('/api/houses')
            ->assertStatus(200);

        $this->actingAs($this->bendahara)
            ->postJson('/api/houses', ['house_number' => 'B-99'])
            ->assertStatus(403);

        $this->actingAs($this->bendahara)
            ->putJson("/api/houses/{$house->id}", ['house_number' => 'B-98'])
            ->assertStatus(403);

        $this->actingAs($this->bendahara)
            ->deleteJson("/api/houses/{$house->id}")
            ->assertStatus(403);
    }

    public function test_warga_cannot_generate_bills(): void
    {
        $response = $this->actingAs($this->warga)
            ->postJson('/api/bills/generate', [
                'month' => 7,
                'year' => 2026,
            ]);

        $response->assertStatus(403);
    }

    public function test_warga_can_view_bills(): void
    {
        $resident = Resident::factory()->create();
        $this->warga->update(['resident_id' => $resident->id]);

        $response = $this->actingAs($this->warga)
            ->getJson('/api/bills');

        $response->assertStatus(200);
    }

    public function test_warga_only_sees_own_bills(): void
    {
        $ownResident = Resident::factory()->create();
        $this->warga->update(['resident_id' => $ownResident->id]);

        $ownBill = Bill::factory()->create(['resident_id' => $ownResident->id]);
        $otherBill = Bill::factory()->create();

        $response = $this->actingAs($this->warga)->getJson('/api/bills');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownBill->id);

        $this->actingAs($this->warga)
            ->getJson("/api/bills/{$otherBill->id}")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->getJson("/api/bills/{$ownBill->id}")
            ->assertStatus(200);
    }

    public function test_warga_only_sees_own_payments(): void
    {
        $ownResident = Resident::factory()->create();
        $this->warga->update(['resident_id' => $ownResident->id]);

        $ownBill = Bill::factory()->create(['resident_id' => $ownResident->id]);
        $otherBill = Bill::factory()->create();

        $ownPayment = Payment::factory()->create(['bill_id' => $ownBill->id]);
        $otherPayment = Payment::factory()->create(['bill_id' => $otherBill->id]);

        $response = $this->actingAs($this->warga)->getJson('/api/payments');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownPayment->id);

        $this->actingAs($this->warga)
            ->getJson("/api/payments/{$otherPayment->id}")
            ->assertStatus(403);
    }

    public function test_admin_can_manage_users(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/users');

        $response->assertStatus(200);
    }

    public function test_bendahara_can_view_reports(): void
    {
        $response = $this->actingAs($this->bendahara)
            ->getJson('/api/reports/summary/2026');

        $response->assertStatus(200);
    }

    public function test_admin_can_invoke_every_trash_action(): void
    {
        foreach ($this->trashRestoreRoutes() as $uri) {
            $this->actingAs($this->admin)
                ->postJson($uri)
                ->assertStatus(200);
        }
    }

    public function test_bendahara_can_invoke_only_financial_trash_actions(): void
    {
        foreach ($this->trashRestoreRoutes() as $permission => $uri) {
            $expectedStatus = in_array($permission, [
                'expense-categories.trash',
                'bills.trash',
                'payments.trash',
                'expenses.trash',
            ], true) ? 200 : 403;

            $this->actingAs($this->bendahara)
                ->postJson($uri)
                ->assertStatus($expectedStatus);
        }
    }

    public function test_warga_receives_403_for_every_trash_action(): void
    {
        foreach ($this->trashRestoreRoutes() as $uri) {
            $this->actingAs($this->warga)
                ->postJson($uri)
                ->assertStatus(403);
        }
    }

    /**
     * @return array<string, string>
     */
    private function trashRestoreRoutes(): array
    {
        $resident = Resident::factory()->create();
        $resident->delete();

        $house = House::factory()->create();
        $house->delete();

        $dueType = DueType::factory()->create();
        $dueType->delete();

        $expenseCategory = ExpenseCategory::factory()->create();
        $expenseCategory->delete();

        $bill = Bill::factory()->create();
        $bill->delete();

        $payment = Payment::factory()->create();
        $payment->delete();

        $expense = Expense::factory()->create();
        $expense->delete();

        $user = User::factory()->create();
        $user->delete();

        return [
            'residents.trash' => "/api/residents/{$resident->id}/restore",
            'houses.trash' => "/api/houses/{$house->id}/restore",
            'due-types.trash' => "/api/due-types/{$dueType->id}/restore",
            'expense-categories.trash' => "/api/expense-categories/{$expenseCategory->id}/restore",
            'bills.trash' => "/api/bills/{$bill->id}/restore",
            'payments.trash' => "/api/payments/{$payment->id}/restore",
            'expenses.trash' => "/api/expenses/{$expense->id}/restore",
            'users.trash' => "/api/users/{$user->id}/restore",
        ];
    }
}
