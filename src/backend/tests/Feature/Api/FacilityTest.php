<?php

namespace Tests\Feature\Api;

use App\Models\DueType;
use App\Models\Facility;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FacilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_crud_facilities_with_due_type_mapping()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $admin->load('roles.permissions');
        $dueType = DueType::factory()->create();

        $created = $this->actingAs($admin)->postJson('/api/facilities', [
            'name' => 'Aula Utama',
            'description' => '<p>Kapasitas 200.</p>',
            'rental_fee' => 150000,
            'due_type_id' => $dueType->id,
        ])->assertStatus(201)->assertJsonPath('data.name', 'Aula Utama')->json('data');

        $this->actingAs($admin)->putJson("/api/facilities/{$created['id']}", ['name' => 'Aula Besar'])
            ->assertStatus(200);
        $this->actingAs($admin)->deleteJson("/api/facilities/{$created['id']}")->assertStatus(200);
        $this->assertSoftDeleted('facilities', ['id' => $created['id']]);
    }

    public function test_warga_can_view_catalog_but_not_manage()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $warga = User::factory()->create();
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');
        Facility::factory()->create(['is_active' => true]);
        Facility::factory()->create(['is_active' => false]);

        $response = $this->actingAs($warga)->getJson('/api/facilities');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
        $this->actingAs($warga)->postJson('/api/facilities', ['name' => 'X'])->assertStatus(403);
    }
}
