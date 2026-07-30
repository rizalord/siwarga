<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\User;
use App\Services\RoleService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class RoleServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    public function test_cannot_rename_admin_role()
    {
        $admin = Role::where('name', Role::ADMIN_ROLE_NAME)->first();

        $this->expectException(ValidationException::class);

        (new RoleService)->update($admin, ['name' => 'super-admin']);
    }

    public function test_cannot_delete_admin_role()
    {
        $admin = Role::where('name', Role::ADMIN_ROLE_NAME)->first();

        $this->expectException(ValidationException::class);

        (new RoleService)->delete($admin);
    }

    public function test_cannot_delete_role_still_in_use()
    {
        $bendahara = Role::where('name', 'bendahara')->first();
        $user = User::factory()->create();
        $user->roles()->attach($bendahara->id);

        $this->expectException(ValidationException::class);

        (new RoleService)->delete($bendahara);
    }

    public function test_can_delete_unused_non_admin_role()
    {
        $warga = Role::where('name', 'warga')->first();

        (new RoleService)->delete($warga);

        $this->assertDatabaseMissing('roles', ['id' => $warga->id]);
    }
}
