<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\User;
use App\Policies\PagePolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PagePolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_pages()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $admin->load('roles.permissions');

        $this->assertTrue((new PagePolicy)->update($admin));
    }

    public function test_warga_cannot_update_pages()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $warga = User::factory()->create();
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');

        $this->assertFalse((new PagePolicy)->update($warga));
    }
}
