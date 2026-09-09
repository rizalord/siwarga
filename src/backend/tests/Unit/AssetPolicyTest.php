<?php

namespace Tests\Unit;

use App\Models\AssetLoan;
use App\Models\Role;
use App\Models\User;
use App\Policies\AssetLoanPolicy;
use App\Policies\AssetPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssetPolicyTest extends TestCase
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

    public function test_admin_manages_assets_and_reviews_loans()
    {
        $admin = $this->actingUser('admin');

        $this->assertTrue((new AssetPolicy)->create($admin));
        $this->assertTrue((new AssetLoanPolicy)->review($admin, AssetLoan::factory()->make()));
    }

    public function test_warga_can_request_but_not_review()
    {
        $warga = $this->actingUser('warga');

        $this->assertTrue((new AssetPolicy)->viewAny($warga));
        $this->assertFalse((new AssetPolicy)->create($warga));
        $this->assertTrue((new AssetLoanPolicy)->create($warga));
        $this->assertFalse((new AssetLoanPolicy)->review($warga, AssetLoan::factory()->make()));
    }

    public function test_loan_return_is_borrower_or_reviewer()
    {
        $warga = $this->actingUser('warga');
        $admin = $this->actingUser('admin');
        $policy = new AssetLoanPolicy;

        $this->assertTrue($policy->return($warga, AssetLoan::factory()->make(['borrowed_by' => $warga->id])));
        $this->assertFalse($policy->return($warga, AssetLoan::factory()->make(['borrowed_by' => 999])));
        $this->assertTrue($policy->return($admin, AssetLoan::factory()->make(['borrowed_by' => 999])));
    }
}
