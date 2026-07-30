<?php

namespace Tests\Feature\Api;

use App\Models\Bill;
use App\Models\House;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HouseTest extends TestCase
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

    public function test_can_list_houses()
    {
        House::factory()->count(3)->create();

        $response = $this->getJson('/api/houses');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.deleted_at', null);
    }

    public function test_house_list_returns_flat_pagination_shape()
    {
        House::factory()->count(15)->create();

        $response = $this->getJson('/api/houses?per_page=10');

        $response->assertStatus(200)->assertJsonStructure([
            'data', 'current_page', 'last_page', 'per_page', 'total',
        ]);
        $this->assertCount(10, $response->json('data'));
        $this->assertEquals(2, $response->json('last_page'));
        $this->assertEquals(15, $response->json('total'));
    }

    public function test_can_filter_houses_by_status()
    {
        $occupied = House::factory()->create(['status' => 'kosong']);
        House::factory()->create(['status' => 'kosong']);
        $resident = Resident::factory()->create();
        $occupied->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $response = $this->getJson('/api/houses?status=dihuni');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_can_filter_houses_by_trashed_mode()
    {
        House::factory()->create(['house_number' => 'A01']);
        $deletedHouse = House::factory()->create(['house_number' => 'B02']);
        $deletedHouse->delete();

        $this->getJson('/api/houses')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.house_number', 'A01');

        $this->getJson('/api/houses?trashed=with')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['house_number' => 'A01'])
            ->assertJsonFragment(['house_number' => 'B02']);

        $this->getJson('/api/houses?trashed=only')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.house_number', 'B02');
    }

    public function test_can_create_house()
    {
        $data = ['house_number' => 'A01', 'address' => 'Jl. Test No. 1'];

        $response = $this->postJson('/api/houses', $data);

        $response->assertStatus(201)->assertJsonPath('data.house_number', 'A01');
    }

    public function test_validates_required_house_fields()
    {
        $response = $this->postJson('/api/houses', []);

        $response->assertStatus(422);
    }

    public function test_can_soft_delete_house()
    {
        $house = House::factory()->create();

        $this->deleteJson("/api/houses/{$house->id}");

        $this->assertSoftDeleted($house);
    }

    public function test_cannot_delete_house_with_transaction_history()
    {
        $house = House::factory()->create();
        Bill::factory()->create(['house_id' => $house->id]);

        $response = $this->deleteJson("/api/houses/{$house->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('houses', ['id' => $house->id, 'deleted_at' => null]);
    }

    public function test_cannot_delete_house_with_active_resident()
    {
        $house = House::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => Resident::factory()->create()->id,
            'start_date' => '2026-01-01',
        ]);

        $response = $this->deleteJson("/api/houses/{$house->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('houses', ['id' => $house->id, 'deleted_at' => null]);
    }

    public function test_can_assign_resident_to_house()
    {
        $house = House::factory()->create();
        $resident = Resident::factory()->create();

        $response = $this->postJson("/api/houses/{$house->id}/assign-resident", [
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $response->assertStatus(201);
    }

    public function test_can_sort_houses_by_house_number()
    {
        House::factory()->create(['house_number' => 'C03']);
        House::factory()->create(['house_number' => 'A01']);

        $response = $this->getJson('/api/houses?sort=house_number&order=asc');

        $response->assertStatus(200);
        $this->assertEquals('A01', $response->json('data.0.house_number'));
        $this->assertEquals('C03', $response->json('data.1.house_number'));
    }

    public function test_can_bulk_delete_houses()
    {
        $houses = House::factory()->count(3)->create();

        $response = $this->postJson('/api/houses/bulk-delete', [
            'ids' => $houses->pluck('id')->take(2)->toArray(),
        ]);

        $response->assertStatus(200);
        $this->assertSoftDeleted($houses[0]);
        $this->assertSoftDeleted($houses[1]);
        $this->assertDatabaseHas('houses', ['id' => $houses[2]->id, 'deleted_at' => null]);
    }

    public function test_bulk_delete_skips_houses_with_transaction_history()
    {
        $withHistory = House::factory()->create();
        Bill::factory()->create(['house_id' => $withHistory->id]);
        $withoutHistory = House::factory()->create();

        $response = $this->postJson('/api/houses/bulk-delete', [
            'ids' => [$withHistory->id, $withoutHistory->id],
        ]);

        $response->assertStatus(207);
        $this->assertDatabaseHas('houses', ['id' => $withHistory->id, 'deleted_at' => null]);
        $this->assertSoftDeleted($withoutHistory);
    }

    public function test_can_vacate_resident_from_house()
    {
        $house = House::factory()->create();
        $resident = Resident::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $response = $this->postJson("/api/houses/{$house->id}/vacate-resident");

        $response->assertStatus(200);
        $this->assertDatabaseHas('houses', ['id' => $house->id, 'status' => 'kosong']);
        $this->assertDatabaseMissing('house_residents', [
            'house_id' => $house->id,
            'resident_id' => $resident->id,
            'end_date' => null,
        ]);
    }

    public function test_cannot_vacate_house_without_active_resident()
    {
        $house = House::factory()->create(['status' => 'kosong']);

        $response = $this->postJson("/api/houses/{$house->id}/vacate-resident");

        $response->assertStatus(422);
    }

    public function test_can_show_house_history()
    {
        $house = House::factory()->create();
        $resident = Resident::factory()->create();

        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $response = $this->getJson("/api/houses/{$house->id}/history");

        $response->assertStatus(200);
    }

    public function test_house_history_still_shows_resident_deleted_after_assignment()
    {
        $house = House::factory()->create();
        $resident = Resident::factory()->create();

        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
            'end_date' => '2026-02-01',
        ]);
        $resident->delete();

        $response = $this->getJson("/api/houses/{$house->id}/history");

        $response->assertStatus(200)
            ->assertJsonPath('data.0.resident.id', $resident->id);
    }

    public function test_can_restore_a_soft_deleted_house()
    {
        $house = House::factory()->create(['house_number' => 'Restore-House']);
        $house->delete();

        $this->postJson("/api/houses/{$house->id}/restore")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $house->id)
            ->assertJsonPath('data.deleted_at', null);

        $this->assertDatabaseHas('houses', ['id' => $house->id, 'deleted_at' => null]);
    }

    public function test_can_force_delete_a_soft_deleted_house()
    {
        $house = House::factory()->create(['house_number' => 'Force-House']);
        $house->delete();

        $this->deleteJson("/api/houses/{$house->id}/force-delete")
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', 'Deleted permanently');

        $this->assertDatabaseMissing('houses', ['id' => $house->id]);
    }

    public function test_can_bulk_restore_houses()
    {
        $houses = House::factory()->count(2)->create();
        $houses->each->delete();

        $this->postJson('/api/houses/bulk-restore', [
            'ids' => $houses->modelKeys(),
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dipulihkan');

        $this->assertDatabaseHas('houses', ['id' => $houses[0]->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('houses', ['id' => $houses[1]->id, 'deleted_at' => null]);
    }

    public function test_can_bulk_force_delete_houses()
    {
        $houses = House::factory()->count(2)->create();
        $houses->each->delete();

        $this->postJson('/api/houses/bulk-force-delete', [
            'ids' => $houses->modelKeys(),
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dihapus permanen');

        $this->assertDatabaseMissing('houses', ['id' => $houses[0]->id]);
        $this->assertDatabaseMissing('houses', ['id' => $houses[1]->id]);
    }

    public function test_warga_cannot_restore_or_permanently_delete_houses()
    {
        $house = House::factory()->create();
        $house->delete();

        $this->actingAs($this->warga)
            ->postJson("/api/houses/{$house->id}/restore")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->deleteJson("/api/houses/{$house->id}/force-delete")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->postJson('/api/houses/bulk-restore', ['ids' => [$house->id]])
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->postJson('/api/houses/bulk-force-delete', ['ids' => [$house->id]])
            ->assertStatus(403);
    }

    public function test_bulk_restore_and_force_delete_validate_ids_payload_for_houses()
    {
        foreach (['/api/houses/bulk-restore', '/api/houses/bulk-force-delete'] as $uri) {
            $this->postJson($uri, ['ids' => []])
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids');

            $this->postJson($uri, ['ids' => ['invalid']])
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids.0');
        }
    }
}
