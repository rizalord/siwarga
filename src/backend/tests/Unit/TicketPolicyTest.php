<?php

namespace Tests\Unit;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\User;
use App\Policies\TicketPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketPolicyTest extends TestCase
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

    public function test_admin_can_do_everything()
    {
        $admin = $this->actingUser('admin');
        $policy = new TicketPolicy;
        $ticket = Ticket::factory()->make(['reported_by' => 999]);

        $this->assertTrue($policy->viewAny($admin));
        $this->assertTrue($policy->view($admin, $ticket));
        $this->assertTrue($policy->create($admin));
        $this->assertTrue($policy->updateStatus($admin));
        $this->assertTrue($policy->assign($admin));
    }

    public function test_warga_can_view_own_but_not_others_and_cannot_manage()
    {
        $warga = $this->actingUser('warga');
        $policy = new TicketPolicy;

        $this->assertTrue($policy->view($warga, Ticket::factory()->make(['reported_by' => $warga->id])));
        $this->assertFalse($policy->view($warga, Ticket::factory()->make(['reported_by' => 999])));
        $this->assertTrue($policy->create($warga));
        $this->assertFalse($policy->updateStatus($warga));
        $this->assertFalse($policy->assign($warga));
    }

    public function test_status_and_assign_permissions_are_separately_grantable()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $role = Role::create(['name' => 'petugas', 'description' => 'Petugas lapangan']);
        $role->permissions()->attach(
            Permission::whereIn('name', ['tickets.view-all', 'tickets.manage-status'])->pluck('id')
        );
        $user = User::factory()->create();
        $user->roles()->attach($role->id);
        $user->load('roles.permissions');

        $this->assertTrue((new TicketPolicy)->updateStatus($user));
        $this->assertFalse((new TicketPolicy)->assign($user));
    }
}
