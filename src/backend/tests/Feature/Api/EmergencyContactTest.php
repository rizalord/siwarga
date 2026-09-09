<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmergencyContactTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_manages_and_warga_reads_contacts()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $admin->load('roles.permissions');
        $warga = User::factory()->create();
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');

        $created = $this->actingAs($admin)->postJson('/api/emergency-contacts', [
            'name' => 'Polsek Setempat',
            'phone' => '081234567890',
        ])->assertStatus(201)->json('data');

        // Warga (no manage perm) can still read, but not write.
        $this->actingAs($warga)->getJson('/api/emergency-contacts')->assertStatus(200)
            ->assertJsonCount(1, 'data');
        $this->actingAs($warga)->postJson('/api/emergency-contacts', [
            'name' => 'X', 'phone' => '080',
        ])->assertStatus(403);

        $this->actingAs($admin)->putJson("/api/emergency-contacts/{$created['id']}", [
            'phone' => '081111111111',
        ])->assertStatus(200);
        $this->actingAs($admin)->deleteJson("/api/emergency-contacts/{$created['id']}")
            ->assertStatus(200);
        $this->assertSoftDeleted('emergency_contacts', ['id' => $created['id']]);
    }
}
