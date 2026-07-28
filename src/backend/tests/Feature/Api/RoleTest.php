<?php

namespace Tests\Feature\Api;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');
        $this->actingAs($this->admin);
    }

    public function test_can_list_roles()
    {
        $response = $this->getJson('/api/roles');

        $response->assertStatus(200);
        // admin, bendahara, warga from RoleSeeder
        $this->assertCount(3, $response->json('data'));
    }

    public function test_can_create_role_with_permissions()
    {
        $permissionIds = Permission::whereIn('name', ['houses.view', 'residents.view'])->pluck('id');

        $response = $this->postJson('/api/roles', [
            'name' => 'petugas',
            'description' => 'Petugas keamanan',
            'permission_ids' => $permissionIds->toArray(),
        ]);

        $response->assertStatus(201)->assertJsonPath('data.name', 'petugas');
        $this->assertCount(2, $response->json('data.permissions'));
    }

    public function test_cannot_create_role_with_duplicate_name()
    {
        $response = $this->postJson('/api/roles', ['name' => 'admin']);

        $response->assertStatus(422);
    }

    public function test_can_update_role_and_sync_permissions()
    {
        $role = Role::create(['name' => 'petugas', 'description' => 'Petugas']);
        $permissionId = Permission::where('name', 'houses.view')->first()->id;

        $response = $this->putJson("/api/roles/{$role->id}", [
            'description' => 'Petugas Keamanan',
            'permission_ids' => [$permissionId],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.description', 'Petugas Keamanan')
            ->assertJsonCount(1, 'data.permissions');
    }

    public function test_can_delete_unused_role()
    {
        $role = Role::create(['name' => 'petugas', 'description' => 'Petugas']);

        $response = $this->deleteJson("/api/roles/{$role->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('roles', ['id' => $role->id]);
    }

    public function test_cannot_delete_role_assigned_to_users()
    {
        $role = Role::where('name', 'warga')->first();
        $user = User::factory()->create();
        $user->roles()->attach($role->id);

        $response = $this->deleteJson("/api/roles/{$role->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('roles', ['id' => $role->id]);
    }

    public function test_cannot_delete_admin_role()
    {
        $adminRole = Role::where('name', 'admin')->first();

        $response = $this->deleteJson("/api/roles/{$adminRole->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('roles', ['id' => $adminRole->id]);
    }

    public function test_cannot_rename_admin_role()
    {
        $adminRole = Role::where('name', 'admin')->first();

        $response = $this->putJson("/api/roles/{$adminRole->id}", [
            'name' => 'super-admin',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('roles', ['id' => $adminRole->id, 'name' => 'admin']);
    }

    public function test_can_update_admin_role_description_without_renaming()
    {
        $adminRole = Role::where('name', 'admin')->first();

        $response = $this->putJson("/api/roles/{$adminRole->id}", [
            'description' => 'Administrator Sistem',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.description', 'Administrator Sistem');
    }
}
