<?php

namespace Tests\Feature\Api;

use App\Models\Bill;
use App\Models\Payment;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTest extends TestCase
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

    public function test_can_list_payments()
    {
        Payment::factory()->count(3)->create();

        $response = $this->getJson('/api/payments');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_can_create_payment()
    {
        $bill = Bill::factory()->create(['amount_due' => 100000]);

        $response = $this->postJson('/api/payments', [
            'bill_id' => $bill->id,
            'amount_paid' => 50000,
            'payment_date' => '2026-01-15',
        ]);

        $response->assertStatus(201);
    }

    public function test_updates_bill_status_to_lunas_when_fully_paid()
    {
        $bill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'belum_lunas']);

        $this->postJson('/api/payments', [
            'bill_id' => $bill->id,
            'amount_paid' => 100000,
            'payment_date' => '2026-01-15',
        ]);

        $this->assertDatabaseHas('bills', ['id' => $bill->id, 'status' => 'lunas']);
    }

    public function test_can_show_payment()
    {
        $payment = Payment::factory()->create();

        $response = $this->getJson("/api/payments/{$payment->id}");

        $response->assertStatus(200);
    }

    public function test_can_update_payment()
    {
        $payment = Payment::factory()->create(['amount_paid' => 50000]);

        $response = $this->putJson("/api/payments/{$payment->id}", ['amount_paid' => 75000]);

        $response->assertStatus(200)->assertJsonPath('data.amount_paid', 75000);
    }

    public function test_can_soft_delete_payment()
    {
        $payment = Payment::factory()->create();

        $this->deleteJson("/api/payments/{$payment->id}");

        $this->assertSoftDeleted($payment);
    }
}
