<?php

namespace Tests\Unit;

use App\Models\Announcement;
use App\Models\Role;
use App\Models\User;
use App\Policies\AnnouncementPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function actingUser(string $role): User
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', $role)->first()->id);
        $user->load('roles.permissions');

        return $user;
    }

    public function test_admin_can_view_and_manage_any_category()
    {
        $admin = $this->actingUser('admin');
        $policy = new AnnouncementPolicy;

        $this->assertTrue($policy->viewAny($admin));
        $this->assertTrue($policy->create($admin));
        $this->assertTrue($policy->update($admin, Announcement::factory()->make(['category' => 'umum'])));
        $this->assertTrue($policy->delete($admin, Announcement::factory()->make(['category' => 'darurat'])));
    }

    public function test_bendahara_can_manage_only_keuangan_category()
    {
        $bendahara = $this->actingUser('bendahara');
        $policy = new AnnouncementPolicy;

        $this->assertTrue($policy->create($bendahara));
        $this->assertTrue($policy->update($bendahara, Announcement::factory()->make(['category' => 'keuangan'])));
        $this->assertFalse($policy->update($bendahara, Announcement::factory()->make(['category' => 'umum'])));
        $this->assertFalse($policy->delete($bendahara, Announcement::factory()->make(['category' => 'darurat'])));
        $this->assertTrue($policy->canManageCategory($bendahara, 'keuangan'));
        $this->assertFalse($policy->canManageCategory($bendahara, 'umum'));
    }

    public function test_warga_can_view_but_not_manage()
    {
        $warga = $this->actingUser('warga');
        $policy = new AnnouncementPolicy;

        $this->assertTrue($policy->viewAny($warga));
        $this->assertFalse($policy->create($warga));
        $this->assertFalse($policy->update($warga, Announcement::factory()->make(['category' => 'umum'])));
    }
}
