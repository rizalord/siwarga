<?php

namespace Tests\Unit;

use App\Models\FamilyMember;
use App\Models\GuestLog;
use App\Models\House;
use App\Models\PanicAlert;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use App\Policies\FamilyMemberPolicy;
use App\Policies\GuestLogPolicy;
use App\Policies\PanicAlertPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function actingUser(string $role, ?int $residentId = null): User
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $user = User::factory()->create(['resident_id' => $residentId]);
        $user->roles()->attach(Role::where('name', $role)->first()->id);
        $user->load('roles.permissions');

        return $user;
    }

    public function test_admin_has_full_security_access()
    {
        $admin = $this->actingUser('admin');

        $this->assertTrue((new GuestLogPolicy)->create($admin));
        $this->assertTrue((new PanicAlertPolicy)->handle($admin, new PanicAlert));
        $this->assertTrue((new FamilyMemberPolicy)->viewAny($admin));
    }

    public function test_satpam_manages_guests_and_handles_panic_but_no_finance_or_family()
    {
        $satpam = $this->actingUser('satpam');

        $this->assertTrue((new GuestLogPolicy)->viewAny($satpam));
        $this->assertTrue((new GuestLogPolicy)->checkIn($satpam, new GuestLog));
        $this->assertTrue((new PanicAlertPolicy)->handle($satpam, new PanicAlert));
        $this->assertFalse($satpam->hasPermission('expenses.view'));
        $this->assertFalse($satpam->hasPermission('residents.view'));
        $this->assertFalse((new FamilyMemberPolicy)->viewAny($satpam));
    }

    public function test_warga_reports_panic_and_registers_guests_but_cannot_check_in()
    {
        $warga = $this->actingUser('warga');

        $this->assertTrue((new PanicAlertPolicy)->report($warga));
        $this->assertTrue((new GuestLogPolicy)->create($warga));
        $this->assertFalse((new GuestLogPolicy)->checkIn($warga, new GuestLog));
        $this->assertFalse((new PanicAlertPolicy)->handle($warga, new PanicAlert));
    }

    public function test_family_member_visibility_is_own_house_or_manager()
    {
        $houseA = House::factory()->create();
        $houseB = House::factory()->create();
        $resident = Resident::factory()->create();
        $houseA->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);
        $warga = $this->actingUser('warga', $resident->id);
        $policy = new FamilyMemberPolicy;

        $own = FamilyMember::factory()->make(['house_id' => $houseA->id]);
        $other = FamilyMember::factory()->make(['house_id' => $houseB->id]);

        $this->assertTrue($policy->view($warga, $own));
        $this->assertFalse($policy->view($warga, $other));
    }

    public function test_panic_cancel_is_reporter_or_handler()
    {
        $warga = $this->actingUser('warga');
        $satpam = $this->actingUser('satpam');
        $policy = new PanicAlertPolicy;

        $own = PanicAlert::factory()->make(['reporter_id' => $warga->id]);
        $other = PanicAlert::factory()->make(['reporter_id' => 999]);

        $this->assertTrue($policy->cancel($warga, $own));
        $this->assertFalse($policy->cancel($warga, $other));
        $this->assertTrue($policy->cancel($satpam, $other));
    }
}
