<?php

namespace Tests\Feature\Api;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionTest extends TestCase
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

    public function test_can_list_permissions()
    {
        $response = $this->getJson('/api/permissions?per_page=100');

        $response->assertStatus(200)->assertJsonCount(count(Permission::SYSTEM_PERMISSIONS), 'data');

        $permissionNames = collect($response->json('data'))->pluck('name')->all();

        foreach ([
            'residents.trash',
            'houses.trash',
            'due-types.trash',
            'expense-categories.trash',
            'bills.trash',
            'payments.trash',
            'expenses.trash',
            'users.trash',
        ] as $permissionName) {
            $this->assertContains($permissionName, $permissionNames);
        }
    }

    public function test_can_create_custom_permission()
    {
        $response = $this->postJson('/api/permissions', [
            'name' => 'custom.export',
            'description' => 'Ekspor kustom',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.name', 'custom.export');
    }

    public function test_rejects_invalid_permission_name_format()
    {
        $response = $this->postJson('/api/permissions', [
            'name' => 'InvalidName',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_update_description_of_system_permission()
    {
        $permission = Permission::where('name', 'houses.view')->first();

        $response = $this->putJson("/api/permissions/{$permission->id}", [
            'description' => 'Deskripsi baru',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.description', 'Deskripsi baru');
    }

    public function test_cannot_rename_system_permission()
    {
        $permission = Permission::where('name', 'houses.view')->first();

        $response = $this->putJson("/api/permissions/{$permission->id}", [
            'name' => 'houses.renamed',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('permissions', ['id' => $permission->id, 'name' => 'houses.view']);
    }

    public function test_cannot_delete_system_permission()
    {
        $permission = Permission::where('name', 'houses.view')->first();

        $response = $this->deleteJson("/api/permissions/{$permission->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('permissions', ['id' => $permission->id]);
    }

    public function test_can_delete_custom_permission()
    {
        $permission = Permission::create(['name' => 'custom.export', 'description' => 'Ekspor kustom']);

        $response = $this->deleteJson("/api/permissions/{$permission->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('permissions', ['id' => $permission->id]);
    }
}
