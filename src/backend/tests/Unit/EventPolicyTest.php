<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\User;
use App\Policies\EventPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_admin_manages_events()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $admin->load('roles.permissions');
        $warga = User::factory()->create();
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');

        $this->assertTrue((new EventPolicy)->viewAny($admin));
        $this->assertTrue((new EventPolicy)->create($admin));
        $this->assertFalse((new EventPolicy)->viewAny($warga));
        $this->assertFalse((new EventPolicy)->create($warga));
    }
}
