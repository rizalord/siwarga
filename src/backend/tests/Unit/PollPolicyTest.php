<?php

namespace Tests\Unit;

use App\Models\Poll;
use App\Models\Role;
use App\Models\User;
use App\Policies\PollPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PollPolicyTest extends TestCase
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

    public function test_admin_can_manage_polls()
    {
        $admin = $this->actingUser('admin');
        $policy = new PollPolicy;

        $this->assertTrue($policy->viewAny($admin));
        $this->assertTrue($policy->create($admin));

        $upcoming = Poll::factory()->make(['starts_at' => now()->addDay(), 'ends_at' => now()->addWeek()]);
        $this->assertTrue($policy->update($admin, $upcoming));

        $ongoing = Poll::factory()->make(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);
        $this->assertFalse($policy->update($admin, $ongoing));
        $this->assertTrue($policy->delete($admin, $ongoing));
        $this->assertTrue($policy->results($admin, $ongoing));
    }

    public function test_warga_can_vote_only_inside_period_and_only_once()
    {
        $warga = $this->actingUser('warga');
        $policy = new PollPolicy;

        $this->assertTrue($policy->viewAny($warga));
        $this->assertFalse($policy->create($warga));

        $ongoing = Poll::factory()->create(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);
        $this->assertTrue($policy->vote($warga, $ongoing));
        $this->assertFalse($policy->results($warga, $ongoing));

        $ended = Poll::factory()->create(['starts_at' => now()->subWeek(), 'ends_at' => now()->subDay()]);
        $this->assertFalse($policy->vote($warga, $ended));
        $this->assertTrue($policy->results($warga, $ended));
    }

    public function test_bendahara_can_view_but_not_vote_or_manage()
    {
        $bendahara = $this->actingUser('bendahara');
        $policy = new PollPolicy;
        $ongoing = Poll::factory()->make(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);

        $this->assertTrue($policy->viewAny($bendahara));
        $this->assertFalse($policy->create($bendahara));
        $this->assertFalse($policy->vote($bendahara, $ongoing));
    }
}
