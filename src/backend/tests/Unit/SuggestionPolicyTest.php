<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\User;
use App\Policies\SuggestionPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuggestionPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_but_warga_can_only_create()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $admin->load('roles.permissions');
        $warga = User::factory()->create();
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');

        $this->assertTrue((new SuggestionPolicy)->viewAny($admin));
        $this->assertTrue((new SuggestionPolicy)->markReviewed($admin));
        $this->assertFalse((new SuggestionPolicy)->viewAny($warga));
        $this->assertTrue((new SuggestionPolicy)->create($warga));
    }
}
