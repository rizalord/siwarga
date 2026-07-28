<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
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
}
