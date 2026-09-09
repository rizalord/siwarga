<?php

namespace Tests\Unit;

use App\Models\FacilityBooking;
use App\Models\Role;
use App\Models\User;
use App\Policies\BookingPolicy;
use App\Policies\FacilityPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingPolicyTest extends TestCase
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

    public function test_admin_can_manage_facilities_and_review_bookings()
    {
        $admin = $this->actingUser('admin');

        $this->assertTrue((new FacilityPolicy)->viewAny($admin));
        $this->assertTrue((new FacilityPolicy)->create($admin));
        $this->assertTrue((new BookingPolicy)->review($admin, FacilityBooking::factory()->make()));
    }

    public function test_warga_can_view_catalog_and_book_but_not_review()
    {
        $warga = $this->actingUser('warga');

        $this->assertTrue((new FacilityPolicy)->viewAny($warga));
        $this->assertFalse((new FacilityPolicy)->create($warga));
        $this->assertTrue((new BookingPolicy)->create($warga));
        $this->assertFalse((new BookingPolicy)->review($warga, FacilityBooking::factory()->make()));
    }

    public function test_booking_visibility_is_own_or_reviewer()
    {
        $warga = $this->actingUser('warga');
        $admin = $this->actingUser('admin');
        $policy = new BookingPolicy;

        $this->assertTrue($policy->view($warga, FacilityBooking::factory()->make(['booked_by' => $warga->id])));
        $this->assertFalse($policy->view($warga, FacilityBooking::factory()->make(['booked_by' => 999])));
        $this->assertTrue($policy->view($admin, FacilityBooking::factory()->make(['booked_by' => 999])));
    }

    public function test_cancel_is_owner_or_reviewer()
    {
        $warga = $this->actingUser('warga');
        $admin = $this->actingUser('admin');
        $policy = new BookingPolicy;

        $this->assertTrue($policy->cancel($warga, FacilityBooking::factory()->make(['booked_by' => $warga->id])));
        $this->assertFalse($policy->cancel($warga, FacilityBooking::factory()->make(['booked_by' => 999])));
        $this->assertTrue($policy->cancel($admin, FacilityBooking::factory()->make(['booked_by' => 999])));
    }
}
