<?php

namespace Tests\Feature\Api;

use App\Models\FamilyMember;
use App\Models\House;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyMemberTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $warga;

    protected House $houseA;

    protected House $houseB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $resident = Resident::factory()->create();
        $this->houseA = House::factory()->create();
        $this->houseB = House::factory()->create();
        $this->houseA->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);

        $this->warga = User::factory()->create(['resident_id' => $resident->id]);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    public function test_warga_manages_own_house_only()
    {
        $own = $this->actingAs($this->warga)->postJson('/api/family-members', [
            'name' => 'Anak Pertama',
            'relationship' => 'anak',
            'nik' => '1234567890123456',
        ])->assertStatus(201)->assertJsonPath('data.nik', '1234567890123456')->json('data');

        // Forcing another house_id is ignored — record lands in own house.
        $this->assertEquals($this->houseA->id, $own['house_id']);

        $other = FamilyMember::factory()->create(['house_id' => $this->houseB->id]);

        $this->actingAs($this->warga)->getJson("/api/family-members/{$other->id}")->assertStatus(403);
        $this->actingAs($this->warga)->getJson('/api/family-members')
            ->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_admin_sees_all_with_nik()
    {
        FamilyMember::factory()->create(['house_id' => $this->houseB->id, 'nik' => '999']);

        $this->actingAs($this->admin)->getJson('/api/family-members')
            ->assertStatus(200)->assertJsonPath('data.0.nik', '999');
    }
}
