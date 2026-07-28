<?php

namespace Tests\Feature\Api;

use App\Models\Bill;
use App\Models\DueType;
use App\Models\House;
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

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->user = User::factory()->create();
        $this->user->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->user->load('roles.permissions');
        $this->actingAs($this->user);
    }

    public function test_can_list_bills()
    {
        Bill::factory()->count(3)->create();

        $response = $this->getJson('/api/bills');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
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
}
