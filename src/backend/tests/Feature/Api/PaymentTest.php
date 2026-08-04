<?php

namespace Tests\Feature\Api;

use App\Models\Bill;
use App\Models\House;
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

    protected User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->user = User::factory()->create();
        $this->user->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->user->load('roles.permissions');

        $this->warga = User::factory()->create();
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
        $this->actingAs($this->user);
    }

    public function test_can_list_payments()
    {
        Payment::factory()->count(3)->create();

        $response = $this->getJson('/api/payments');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_payment_list_includes_bill_house_and_resident()
    {
        Payment::factory()->create();

        $response = $this->getJson('/api/payments');

        $response->assertStatus(200)->assertJsonStructure([
            'data' => [
                '*' => [
                    'bill' => ['house', 'resident', 'due_type'],
                ],
            ],
        ]);
        $this->assertNotNull($response->json('data.0.bill.house.house_number'));
        $this->assertNotNull($response->json('data.0.bill.resident.full_name'));
    }

    public function test_payment_list_returns_flat_pagination_shape()
    {
        Payment::factory()->count(15)->create();

        $response = $this->getJson('/api/payments?per_page=10');

        $response->assertStatus(200)->assertJsonStructure([
            'data', 'current_page', 'last_page', 'per_page', 'total',
        ]);
        $this->assertCount(10, $response->json('data'));
        $this->assertEquals(2, $response->json('last_page'));
    }

    public function test_can_filter_payments_by_month_year_and_search()
    {
        $house = House::factory()->create(['house_number' => 'A01']);
        $bill = Bill::factory()->create(['house_id' => $house->id]);
        Payment::factory()->create(['bill_id' => $bill->id, 'payment_date' => '2026-01-15']);
        Payment::factory()->create(['payment_date' => '2026-02-15']);

        $this->getJson('/api/payments?month=1&year=2026')
            ->assertStatus(200)->assertJsonCount(1, 'data');

        $this->getJson('/api/payments?search=A01')
            ->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_can_filter_payments_by_trashed_mode()
    {
        Payment::factory()->create();
        $deletedPayment = Payment::factory()->create();
        $deletedPayment->delete();

        $this->getJson('/api/payments')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', Payment::query()->whereNull('deleted_at')->first()->id);

        $this->getJson('/api/payments?trashed=with')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => $deletedPayment->id]);

        $this->getJson('/api/payments?trashed=only')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $deletedPayment->id);
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

    public function test_cannot_create_payment_exceeding_bill_remaining()
    {
        $bill = Bill::factory()->create(['amount_due' => 15000, 'status' => 'belum_lunas']);

        $this->postJson('/api/payments', [
            'bill_id' => $bill->id,
            'amount_paid' => 10000,
            'payment_date' => '2026-01-15',
        ])->assertStatus(201);

        $this->postJson('/api/payments', [
            'bill_id' => $bill->id,
            'amount_paid' => 15000,
            'payment_date' => '2026-01-16',
        ])->assertStatus(422)->assertJsonValidationErrors('amount_paid');
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
        $bill = Bill::factory()->create(['amount_due' => 100000]);
        $payment = Payment::factory()->create(['bill_id' => $bill->id, 'amount_paid' => 50000]);

        $response = $this->putJson("/api/payments/{$payment->id}", ['amount_paid' => 75000]);

        $response->assertStatus(200)->assertJsonPath('data.amount_paid', 75000);
    }

    public function test_moving_payment_to_another_bill_refreshes_old_bill_status()
    {
        $oldBill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'belum_lunas']);
        $newBill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'belum_lunas']);

        $createResponse = $this->postJson('/api/payments', [
            'bill_id' => $oldBill->id,
            'amount_paid' => 100000,
            'payment_date' => '2026-01-15',
        ]);
        $paymentId = $createResponse->json('data.id');
        $this->assertDatabaseHas('bills', ['id' => $oldBill->id, 'status' => 'lunas']);

        $response = $this->putJson("/api/payments/{$paymentId}", ['bill_id' => $newBill->id]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('bills', ['id' => $oldBill->id, 'status' => 'belum_lunas']);
        $this->assertDatabaseHas('bills', ['id' => $newBill->id, 'status' => 'lunas']);
    }

    public function test_can_soft_delete_payment()
    {
        $payment = Payment::factory()->create();

        $this->deleteJson("/api/payments/{$payment->id}");

        $this->assertSoftDeleted($payment);
    }

    public function test_can_sort_payments_by_amount_paid()
    {
        Payment::factory()->create(['amount_paid' => 200000]);
        Payment::factory()->create(['amount_paid' => 100000]);

        $response = $this->getJson('/api/payments?sort=amount_paid&order=asc');

        $response->assertStatus(200);
        $this->assertEquals(100000, $response->json('data.0.amount_paid'));
        $this->assertEquals(200000, $response->json('data.1.amount_paid'));
    }

    public function test_can_bulk_delete_payments_and_recheck_bill_status()
    {
        $bill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'lunas']);
        $payment = Payment::factory()->create(['bill_id' => $bill->id, 'amount_paid' => 100000]);
        $other = Payment::factory()->create();

        $response = $this->postJson('/api/payments/bulk-delete', [
            'ids' => [$payment->id, $other->id],
        ]);

        $response->assertStatus(200);
        $this->assertSoftDeleted($payment);
        $this->assertSoftDeleted($other);
        $this->assertDatabaseHas('bills', ['id' => $bill->id, 'status' => 'belum_lunas']);
    }

    public function test_can_restore_a_soft_deleted_payment()
    {
        $payment = Payment::factory()->create();
        $payment->delete();

        $this->postJson("/api/payments/{$payment->id}/restore")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $payment->id)
            ->assertJsonPath('data.deleted_at', null);

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'deleted_at' => null]);
    }

    public function test_cannot_restore_an_active_payment()
    {
        $payment = Payment::factory()->create();

        $this->postJson("/api/payments/{$payment->id}/restore")
            ->assertStatus(422)
            ->assertJsonValidationErrors('id');

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'deleted_at' => null]);
    }

    public function test_can_force_delete_a_soft_deleted_payment()
    {
        $payment = Payment::factory()->create();
        $payment->delete();

        $this->deleteJson("/api/payments/{$payment->id}/force-delete")
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', 'Deleted permanently');

        $this->assertDatabaseMissing('payments', ['id' => $payment->id]);
    }

    public function test_cannot_force_delete_an_active_payment()
    {
        $payment = Payment::factory()->create();

        $this->deleteJson("/api/payments/{$payment->id}/force-delete")
            ->assertStatus(422)
            ->assertJsonValidationErrors('id');

        $this->assertDatabaseHas('payments', ['id' => $payment->id]);
    }

    public function test_can_bulk_restore_payments()
    {
        $payments = Payment::factory()->count(2)->create();
        $payments->each->delete();

        $this->postJson('/api/payments/bulk-restore', [
            'ids' => $payments->modelKeys(),
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dipulihkan');

        $this->assertDatabaseHas('payments', ['id' => $payments[0]->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('payments', ['id' => $payments[1]->id, 'deleted_at' => null]);
    }

    public function test_bulk_restore_payments_ignores_active_ids()
    {
        $activePayment = Payment::factory()->create();
        $trashedPayment = Payment::factory()->create();
        $trashedPayment->delete();

        $this->postJson('/api/payments/bulk-restore', [
            'ids' => [$activePayment->id, $trashedPayment->id],
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '1 data berhasil dipulihkan');

        $this->assertDatabaseHas('payments', ['id' => $activePayment->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('payments', ['id' => $trashedPayment->id, 'deleted_at' => null]);
    }

    public function test_can_bulk_force_delete_payments()
    {
        $payments = Payment::factory()->count(2)->create();
        $payments->each->delete();

        $this->postJson('/api/payments/bulk-force-delete', [
            'ids' => $payments->modelKeys(),
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dihapus permanen');

        $this->assertDatabaseMissing('payments', ['id' => $payments[0]->id]);
        $this->assertDatabaseMissing('payments', ['id' => $payments[1]->id]);
    }

    public function test_bulk_force_delete_payments_ignores_active_ids()
    {
        $activePayment = Payment::factory()->create();
        $trashedPayment = Payment::factory()->create();
        $trashedPayment->delete();

        $this->postJson('/api/payments/bulk-force-delete', [
            'ids' => [$activePayment->id, $trashedPayment->id],
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '1 data berhasil dihapus permanen');

        $this->assertDatabaseHas('payments', ['id' => $activePayment->id]);
        $this->assertDatabaseMissing('payments', ['id' => $trashedPayment->id]);
    }

    public function test_restoring_a_payment_recomputes_the_related_bill_status()
    {
        $bill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'lunas']);
        $payment = Payment::factory()->create(['bill_id' => $bill->id, 'amount_paid' => 100000]);

        $this->deleteJson("/api/payments/{$payment->id}")
            ->assertStatus(200);

        $this->assertDatabaseHas('bills', ['id' => $bill->id, 'status' => 'belum_lunas']);

        $this->postJson("/api/payments/{$payment->id}/restore")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $payment->id);

        $this->assertDatabaseHas('bills', ['id' => $bill->id, 'status' => 'lunas']);
    }

    public function test_bulk_restoring_payments_recomputes_the_related_bill_status()
    {
        $bill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'lunas']);
        $payment = Payment::factory()->create(['bill_id' => $bill->id, 'amount_paid' => 100000]);

        $this->postJson('/api/payments/bulk-delete', [
            'ids' => [$payment->id],
        ])->assertStatus(200);

        $this->assertDatabaseHas('bills', ['id' => $bill->id, 'status' => 'belum_lunas']);

        $this->postJson('/api/payments/bulk-restore', [
            'ids' => [$payment->id],
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '1 data berhasil dipulihkan');

        $this->assertDatabaseHas('bills', ['id' => $bill->id, 'status' => 'lunas']);
    }

    public function test_warga_cannot_restore_or_permanently_delete_payments()
    {
        $payment = Payment::factory()->create();
        $payment->delete();

        $this->actingAs($this->warga)
            ->postJson("/api/payments/{$payment->id}/restore")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->deleteJson("/api/payments/{$payment->id}/force-delete")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->postJson('/api/payments/bulk-restore', ['ids' => [$payment->id]])
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->postJson('/api/payments/bulk-force-delete', ['ids' => [$payment->id]])
            ->assertStatus(403);
    }

    public function test_bulk_restore_and_force_delete_validate_ids_payload_for_payments()
    {
        foreach (['/api/payments/bulk-restore', '/api/payments/bulk-force-delete'] as $uri) {
            $this->postJson($uri, ['ids' => []])
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids');

            $this->postJson($uri, ['ids' => ['invalid']])
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids.0');
        }
    }
}
