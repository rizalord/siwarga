<?php

namespace Tests\Feature\Api;

use App\Models\Bill;
use App\Models\DueType;
use App\Models\House;
use App\Models\Payment;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillTest extends TestCase
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

    public function test_can_list_bills()
    {
        Bill::factory()->count(3)->create();

        $response = $this->getJson('/api/bills');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_bill_list_keeps_soft_deleted_due_type_in_response()
    {
        $dueType = DueType::factory()->create(['name' => 'Iuran Terhapus']);
        Bill::factory()->create(['due_type_id' => $dueType->id]);
        $dueType->delete();

        $this->getJson('/api/bills')
            ->assertStatus(200)
            ->assertJsonPath('data.0.due_type.id', $dueType->id)
            ->assertJsonPath('data.0.due_type.name', 'Iuran Terhapus');
    }

    public function test_bill_list_includes_total_paid()
    {
        $bill = Bill::factory()->create(['amount_due' => 15000, 'status' => 'belum_lunas']);
        Payment::factory()->create(['bill_id' => $bill->id, 'amount_paid' => 10000]);

        $this->getJson('/api/bills')
            ->assertStatus(200)
            ->assertJsonPath('data.0.total_paid', 10000);
    }

    public function test_can_filter_bills_by_month_and_year()
    {
        Bill::factory()->create([
            'period_start' => '2026-01-01',
            'period_end' => '2026-01-31',
        ]);
        Bill::factory()->create([
            'period_start' => '2026-02-01',
            'period_end' => '2026-02-28',
        ]);

        $response = $this->getJson('/api/bills?month=1&year=2026');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_can_filter_bills_by_status()
    {
        Bill::factory()->create(['status' => 'lunas']);
        Bill::factory()->create(['status' => 'belum_lunas']);

        $response = $this->getJson('/api/bills?status=lunas');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_can_filter_bills_by_trashed_mode()
    {
        Bill::factory()->create();
        $deletedBill = Bill::factory()->create();
        $deletedBill->delete();

        $this->getJson('/api/bills')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', Bill::query()->whereNull('deleted_at')->first()->id);

        $this->getJson('/api/bills?trashed=with')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => $deletedBill->id]);

        $this->getJson('/api/bills?trashed=only')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $deletedBill->id);
    }

    public function test_can_search_bills_by_resident_or_house()
    {
        $house = House::factory()->create(['house_number' => 'A01']);
        $resident = Resident::factory()->create(['full_name' => 'Budi Santoso']);
        Bill::factory()->create(['house_id' => $house->id, 'resident_id' => $resident->id]);
        Bill::factory()->create();

        $this->getJson('/api/bills?search=Budi')
            ->assertStatus(200)->assertJsonCount(1, 'data');

        $this->getJson('/api/bills?search=A01')
            ->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_can_generate_bills()
    {
        $dueType = DueType::factory()->create(['amount' => 100000, 'billing_cycle' => 'bulanan']);
        $house = House::factory()->create(['status' => 'dihuni']);
        $resident = Resident::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $response = $this->postJson('/api/bills/generate', [
            'month' => 1,
            'year' => 2026,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('bills', [
            'house_id' => $house->id,
            'due_type_id' => $dueType->id,
            'amount_due' => '100000',
        ]);
    }

    public function test_generate_is_idempotent()
    {
        $dueType = DueType::factory()->create(['amount' => 100000, 'billing_cycle' => 'bulanan']);
        $house = House::factory()->create(['status' => 'dihuni']);
        $resident = Resident::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $this->postJson('/api/bills/generate', ['month' => 1, 'year' => 2026]);
        $this->postJson('/api/bills/generate', ['month' => 1, 'year' => 2026]);

        $this->assertDatabaseCount('bills', 1);
    }

    public function test_annual_due_type_generates_one_bill_covering_full_year()
    {
        $dueType = DueType::factory()->create(['amount' => 15000, 'billing_cycle' => 'fleksibel']);
        $house = House::factory()->create(['status' => 'dihuni']);
        $resident = Resident::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $this->postJson('/api/bills/generate', ['month' => 1, 'year' => 2026]);
        // Generating again for a different month in the same year must not duplicate the annual bill.
        $this->postJson('/api/bills/generate', ['month' => 6, 'year' => 2026]);

        $this->assertDatabaseCount('bills', 1);
        $bill = Bill::first();
        $this->assertEquals($house->id, $bill->house_id);
        $this->assertEquals($dueType->id, $bill->due_type_id);
        $this->assertEquals(180000, $bill->amount_due);
        $this->assertEquals('2026-01-01', $bill->period_start->toDateString());
        $this->assertEquals('2026-12-31', $bill->period_end->toDateString());
    }

    public function test_can_show_bill()
    {
        $bill = Bill::factory()->create();

        $response = $this->getJson("/api/bills/{$bill->id}");

        $response->assertStatus(200);
    }

    public function test_can_soft_delete_bill()
    {
        $bill = Bill::factory()->create();

        $this->deleteJson("/api/bills/{$bill->id}");

        $this->assertSoftDeleted($bill);
    }

    public function test_cannot_delete_bill_with_payments()
    {
        $bill = Bill::factory()->create();
        Payment::factory()->create(['bill_id' => $bill->id]);

        $response = $this->deleteJson("/api/bills/{$bill->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('bills', ['id' => $bill->id, 'deleted_at' => null]);
    }

    public function test_can_sort_bills_by_amount_due()
    {
        Bill::factory()->create(['amount_due' => 200000]);
        Bill::factory()->create(['amount_due' => 100000]);

        $response = $this->getJson('/api/bills?sort=amount_due&order=asc');

        $response->assertStatus(200);
        $this->assertEquals(100000, $response->json('data.0.amount_due'));
        $this->assertEquals(200000, $response->json('data.1.amount_due'));
    }

    public function test_can_bulk_delete_bills()
    {
        $bills = Bill::factory()->count(3)->create();

        $response = $this->postJson('/api/bills/bulk-delete', [
            'ids' => $bills->pluck('id')->take(2)->toArray(),
        ]);

        $response->assertStatus(200);
        $this->assertSoftDeleted($bills[0]);
        $this->assertSoftDeleted($bills[1]);
        $this->assertDatabaseHas('bills', ['id' => $bills[2]->id, 'deleted_at' => null]);
    }

    public function test_bulk_delete_skips_bills_with_payments()
    {
        $bills = Bill::factory()->count(2)->create();
        Payment::factory()->create(['bill_id' => $bills[0]->id]);

        $response = $this->postJson('/api/bills/bulk-delete', [
            'ids' => $bills->pluck('id')->toArray(),
        ]);

        $response->assertStatus(207);
        $this->assertDatabaseHas('bills', ['id' => $bills[0]->id, 'deleted_at' => null]);
        $this->assertSoftDeleted($bills[1]);
    }

    public function test_can_restore_a_soft_deleted_bill()
    {
        $bill = Bill::factory()->create();
        $bill->delete();

        $this->postJson("/api/bills/{$bill->id}/restore")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $bill->id)
            ->assertJsonPath('data.deleted_at', null);

        $this->assertDatabaseHas('bills', ['id' => $bill->id, 'deleted_at' => null]);
    }

    public function test_can_force_delete_a_soft_deleted_bill()
    {
        $bill = Bill::factory()->create();
        $bill->delete();

        $this->deleteJson("/api/bills/{$bill->id}/force-delete")
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', 'Deleted permanently');

        $this->assertDatabaseMissing('bills', ['id' => $bill->id]);
    }

    public function test_can_bulk_restore_bills()
    {
        $bills = Bill::factory()->count(2)->create();
        $bills->each->delete();

        $this->postJson('/api/bills/bulk-restore', [
            'ids' => $bills->modelKeys(),
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dipulihkan');

        $this->assertDatabaseHas('bills', ['id' => $bills[0]->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('bills', ['id' => $bills[1]->id, 'deleted_at' => null]);
    }

    public function test_can_bulk_force_delete_bills()
    {
        $bills = Bill::factory()->count(2)->create();
        $bills->each->delete();

        $this->postJson('/api/bills/bulk-force-delete', [
            'ids' => $bills->modelKeys(),
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dihapus permanen');

        $this->assertDatabaseMissing('bills', ['id' => $bills[0]->id]);
        $this->assertDatabaseMissing('bills', ['id' => $bills[1]->id]);
    }

    public function test_bulk_force_delete_bills_returns_validation_error_when_a_bill_is_still_referenced()
    {
        $bill = Bill::factory()->create();
        Payment::factory()->create(['bill_id' => $bill->id]);
        $bill->delete();

        $this->postJson('/api/bills/bulk-force-delete', [
            'ids' => [$bill->id],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('ids');

        $this->assertDatabaseHas('bills', ['id' => $bill->id]);
    }

    public function test_warga_cannot_restore_or_permanently_delete_bills()
    {
        $bill = Bill::factory()->create();
        $bill->delete();

        $this->actingAs($this->warga)
            ->postJson("/api/bills/{$bill->id}/restore")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->deleteJson("/api/bills/{$bill->id}/force-delete")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->postJson('/api/bills/bulk-restore', ['ids' => [$bill->id]])
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->postJson('/api/bills/bulk-force-delete', ['ids' => [$bill->id]])
            ->assertStatus(403);
    }

    public function test_bulk_restore_and_force_delete_validate_ids_payload_for_bills()
    {
        foreach (['/api/bills/bulk-restore', '/api/bills/bulk-force-delete'] as $uri) {
            $this->postJson($uri, ['ids' => []])
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids');

            $this->postJson($uri, ['ids' => ['invalid']])
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids.0');
        }
    }
}
