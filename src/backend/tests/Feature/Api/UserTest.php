<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
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

    public function test_can_list_users()
    {
        User::factory()->count(3)->create();

        $response = $this->getJson('/api/users');

        $response->assertStatus(200);
        $this->assertIsArray($response->json('data'));
        // 3 created + the admin acting user from setUp()
        $this->assertCount(4, $response->json('data'));
    }

    public function test_can_search_users_by_name_or_email()
    {
        User::factory()->create(['name' => 'Budi Santoso', 'email' => 'budi@test.com']);
        User::factory()->create(['name' => 'Ani Wijaya', 'email' => 'ani@test.com']);

        $this->getJson('/api/users?search=Budi')
            ->assertStatus(200);
        $this->assertCount(1, $this->getJson('/api/users?search=Budi')->json('data'));

        $this->assertCount(1, $this->getJson('/api/users?search=ani@test.com')->json('data'));
    }

    public function test_can_create_user()
    {
        $response = $this->postJson('/api/users', [
            'name' => 'New User',
            'email' => 'new@test.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.name', 'New User');
    }

    public function test_can_update_user()
    {
        $user = User::factory()->create();

        $response = $this->putJson("/api/users/{$user->id}", [
            'name' => 'Updated Name',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.name', 'Updated Name');
    }

    public function test_can_soft_delete_user()
    {
        $user = User::factory()->create();

        $this->deleteJson("/api/users/{$user->id}");

        $this->assertSoftDeleted($user);
    }

    public function test_can_sort_users_by_name()
    {
        User::factory()->create(['name' => 'Zzz Zulkifli']);
        User::factory()->create(['name' => 'Aaa Ani']);

        $response = $this->getJson('/api/users?sort=name&order=asc');

        $response->assertStatus(200);
        $names = collect($response->json('data'))->pluck('name')->toArray();
        $this->assertTrue(array_search('Aaa Ani', $names) < array_search('Zzz Zulkifli', $names));
    }

    public function test_can_bulk_delete_users()
    {
        $users = User::factory()->count(2)->create();

        $response = $this->postJson('/api/users/bulk-delete', [
            'ids' => $users->pluck('id')->toArray(),
        ]);

        $response->assertStatus(200);
        $this->assertSoftDeleted($users[0]);
        $this->assertSoftDeleted($users[1]);
    }

    public function test_cannot_assign_admin_role_to_a_second_user_on_create()
    {
        $adminRoleId = Role::where('name', 'admin')->first()->id;

        $response = $this->postJson('/api/users', [
            'name' => 'Second Admin',
            'email' => 'second-admin@test.com',
            'password' => 'password123',
            'role_ids' => [$adminRoleId],
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('users', ['email' => 'second-admin@test.com']);
    }

    public function test_cannot_assign_admin_role_to_a_second_user_on_update()
    {
        $adminRoleId = Role::where('name', 'admin')->first()->id;
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', 'warga')->first()->id);

        $response = $this->putJson("/api/users/{$user->id}", [
            'role_ids' => [$adminRoleId],
        ]);

        $response->assertStatus(422);
        $this->assertFalse($user->fresh()->roles()->where('name', 'admin')->exists());
    }

    public function test_cannot_move_an_admin_user_to_another_role()
    {
        $wargaRoleId = Role::where('name', 'warga')->first()->id;

        $response = $this->putJson("/api/users/{$this->admin->id}", [
            'role_ids' => [$wargaRoleId],
        ]);

        $response->assertStatus(422);
        $this->assertTrue($this->admin->fresh()->roles()->where('name', 'admin')->exists());
    }

    public function test_can_update_admin_user_without_changing_roles()
    {
        $response = $this->putJson("/api/users/{$this->admin->id}", [
            'name' => 'Updated Admin Name',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.name', 'Updated Admin Name');
    }
}
