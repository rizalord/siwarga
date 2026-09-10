<?php

namespace Tests\Unit;

use App\Models\CameraSnapshot;
use App\Models\Role;
use App\Models\User;
use App\Policies\CameraPolicy;
use App\Policies\CameraSnapshotPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CameraPolicyTest extends TestCase
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

    public function test_admin_manages_cameras_and_views_snapshots()
    {
        $admin = $this->actingUser('admin');

        $this->assertTrue((new CameraPolicy)->create($admin));
        $this->assertTrue((new CameraSnapshotPolicy)->view($admin, new CameraSnapshot));
    }

    public function test_satpam_views_but_does_not_manage()
    {
        $satpam = $this->actingUser('satpam');

        $this->assertTrue((new CameraPolicy)->viewAny($satpam));
        $this->assertFalse((new CameraPolicy)->create($satpam));
        $this->assertTrue((new CameraSnapshotPolicy)->view($satpam, new CameraSnapshot));
    }

    public function test_warga_has_no_snapshot_access()
    {
        $warga = $this->actingUser('warga');

        $this->assertFalse((new CameraSnapshotPolicy)->view($warga, new CameraSnapshot));
        $this->assertFalse((new CameraPolicy)->viewAny($warga));
    }
}
