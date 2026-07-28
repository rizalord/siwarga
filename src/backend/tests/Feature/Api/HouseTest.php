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

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->user = User::factory()->create();
        $this->user->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->user->load('roles.permissions');
        $this->actingAs($this->user);
    }

    public function test_can_list_houses()
    {
        House::factory()->count(3)->create();

        $response = $this->getJson('/api/houses');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
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
}
