<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\User;
use App\Services\UserService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class UserServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    public function test_cannot_create_second_admin()
    {
        $adminRoleId = Role::where('name', Role::ADMIN_ROLE_NAME)->value('id');
        $existingAdmin = User::factory()->create();
        $existingAdmin->roles()->attach($adminRoleId);

        $this->expectException(ValidationException::class);

        (new UserService)->create([
            'name' => 'Second Admin',
            'email' => 'second-admin@siwarga.test',
            'password' => 'password',
            'role_ids' => [$adminRoleId],
        ]);
    }

    public function test_cannot_demote_admin_user()
    {
        $adminRoleId = Role::where('name', Role::ADMIN_ROLE_NAME)->value('id');
        $wargaRoleId = Role::where('name', 'warga')->value('id');
        $admin = User::factory()->create();
        $admin->roles()->attach($adminRoleId);

        $this->expectException(ValidationException::class);

        (new UserService)->update($admin, ['role_ids' => [$wargaRoleId]]);
    }

    public function test_cannot_delete_admin_user()
    {
        $adminRoleId = Role::where('name', Role::ADMIN_ROLE_NAME)->value('id');
        $admin = User::factory()->create();
        $admin->roles()->attach($adminRoleId);

        $this->expectException(ValidationException::class);

        (new UserService)->delete($admin);
    }

    public function test_bulk_deletable_is_false_if_any_id_is_admin()
    {
        $adminRoleId = Role::where('name', Role::ADMIN_ROLE_NAME)->value('id');
        $admin = User::factory()->create();
        $admin->roles()->attach($adminRoleId);
        $regular = User::factory()->create();

        $this->assertFalse((new UserService)->bulkDeletable([$admin->id, $regular->id]));
        $this->assertTrue((new UserService)->bulkDeletable([$regular->id]));
    }
}
