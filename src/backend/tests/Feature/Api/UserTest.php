<?php

namespace Tests\Feature\Api;

use App\Models\Resident;
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

    protected User $warga;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $this->warga = User::factory()->create();
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
        $this->actingAs($this->admin);
    }

    public function test_can_list_users()
    {
        User::factory()->count(3)->create();

        $response = $this->getJson('/api/users');

        $response->assertStatus(200);
        $this->assertIsArray($response->json('data'));
        // 3 created + admin + warga from setUp()
        $this->assertCount(5, $response->json('data'));
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

    public function test_can_filter_users_by_trashed_mode()
    {
        User::factory()->create(['name' => 'User Aktif', 'email' => 'aktif@test.com']);
        $deletedUser = User::factory()->create(['name' => 'User Terhapus', 'email' => 'deleted@test.com']);
        $deletedUser->delete();

        $this->getJson('/api/users')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data')
            ->assertJsonMissing(['name' => 'User Terhapus']);

        $this->getJson('/api/users?trashed=with')
            ->assertStatus(200)
            ->assertJsonCount(4, 'data')
            ->assertJsonFragment(['name' => 'User Terhapus']);

        $this->getJson('/api/users?trashed=only')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'User Terhapus');
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

    public function test_can_create_warga_user_linked_to_a_resident()
    {
        $resident = Resident::factory()->create();

        $response = $this->postJson('/api/users', [
            'name' => 'Warga Baru',
            'email' => 'warga-baru@test.com',
            'password' => 'password123',
            'resident_id' => $resident->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.resident.id', $resident->id);
        $this->assertDatabaseHas('users', [
            'email' => 'warga-baru@test.com',
            'resident_id' => $resident->id,
        ]);
    }

    public function test_cannot_link_two_users_to_the_same_resident()
    {
        $resident = Resident::factory()->create();
        User::factory()->create(['resident_id' => $resident->id]);

        $response = $this->postJson('/api/users', [
            'name' => 'Warga Duplikat',
            'email' => 'warga-duplikat@test.com',
            'password' => 'password123',
            'resident_id' => $resident->id,
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('users', ['email' => 'warga-duplikat@test.com']);
    }

    public function test_can_update_user_resident_link()
    {
        $resident = Resident::factory()->create();
        $user = User::factory()->create();

        $response = $this->putJson("/api/users/{$user->id}", [
            'resident_id' => $resident->id,
        ]);

        $response->assertStatus(200);
        $this->assertSame($resident->id, $user->fresh()->resident_id);
    }

    public function test_cannot_delete_admin_user()
    {
        $response = $this->deleteJson("/api/users/{$this->admin->id}");

        $response->assertStatus(422);
        $this->assertNotSoftDeleted($this->admin);
    }

    public function test_cannot_force_delete_a_soft_deleted_admin_user()
    {
        $this->admin->delete();

        $response = $this->deleteJson("/api/users/{$this->admin->id}/force-delete");

        $response->assertStatus(422);
        $this->assertDatabaseHas('users', ['id' => $this->admin->id]);
    }

    public function test_cannot_bulk_delete_admin_user()
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/users/bulk-delete', [
            'ids' => [$this->admin->id, $user->id],
        ]);

        $response->assertStatus(422);
        $this->assertNotSoftDeleted($this->admin);
        $this->assertNotSoftDeleted($user);
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

    public function test_can_restore_a_soft_deleted_user()
    {
        $user = User::factory()->create(['name' => 'Restore User', 'email' => 'restore-user@test.com']);
        $user->delete();

        $this->postJson("/api/users/{$user->id}/restore")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.deleted_at', null);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'deleted_at' => null]);
    }

    public function test_can_force_delete_a_soft_deleted_user()
    {
        $user = User::factory()->create(['name' => 'Force User', 'email' => 'force-user@test.com']);
        $user->delete();

        $this->deleteJson("/api/users/{$user->id}/force-delete")
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', 'Deleted permanently');

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_can_bulk_restore_users()
    {
        $users = User::factory()->count(2)->create();
        $users->each->delete();

        $this->postJson('/api/users/bulk-restore', [
            'ids' => $users->modelKeys(),
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dipulihkan');

        $this->assertDatabaseHas('users', ['id' => $users[0]->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('users', ['id' => $users[1]->id, 'deleted_at' => null]);
    }

    public function test_can_bulk_force_delete_users()
    {
        $users = User::factory()->count(2)->create();
        $users->each->delete();

        $this->postJson('/api/users/bulk-force-delete', [
            'ids' => $users->modelKeys(),
        ])
            ->assertStatus(200)
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', '2 data berhasil dihapus permanen');

        $this->assertDatabaseMissing('users', ['id' => $users[0]->id]);
        $this->assertDatabaseMissing('users', ['id' => $users[1]->id]);
    }

    public function test_warga_cannot_restore_or_permanently_delete_users()
    {
        $user = User::factory()->create();
        $user->delete();

        $this->actingAs($this->warga)
            ->postJson("/api/users/{$user->id}/restore")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->deleteJson("/api/users/{$user->id}/force-delete")
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->postJson('/api/users/bulk-restore', ['ids' => [$user->id]])
            ->assertStatus(403);

        $this->actingAs($this->warga)
            ->postJson('/api/users/bulk-force-delete', ['ids' => [$user->id]])
            ->assertStatus(403);
    }

    public function test_bulk_restore_and_force_delete_validate_ids_payload_for_users()
    {
        foreach (['/api/users/bulk-restore', '/api/users/bulk-force-delete'] as $uri) {
            $this->postJson($uri, ['ids' => []])
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids');

            $this->postJson($uri, ['ids' => ['invalid']])
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids.0');
        }
    }
}
