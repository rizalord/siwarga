<?php

namespace Tests\Feature\Api;

use App\Jobs\SendBookingWhatsappJob;
use App\Models\Bill;
use App\Models\DueType;
use App\Models\Facility;
use App\Models\FacilityBooking;
use App\Models\House;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $warga;

    protected Facility $hall;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $resident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);

        $this->warga = User::factory()->create(['resident_id' => $resident->id]);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');

        $this->hall = Facility::factory()->create(['name' => 'Aula', 'rental_fee' => null]);
    }

    protected function slot(int $dayOffset = 1): array
    {
        return [
            'start_at' => now()->addDays($dayOffset)->setHour(9)->setMinute(0)->toDateTimeString(),
            'end_at' => now()->addDays($dayOffset)->setHour(12)->setMinute(0)->toDateTimeString(),
        ];
    }

    public function test_warga_can_request_pending_even_overlapping_pending()
    {
        $slot = $this->slot();
        FacilityBooking::factory()->create(['facility_id' => $this->hall->id, 'status' => 'pending'] + $slot);

        $response = $this->actingAs($this->warga)->postJson('/api/bookings', [
            'facility_id' => $this->hall->id,
        ] + $slot);

        $response->assertStatus(201)->assertJsonPath('data.status', 'pending');
    }

    public function test_approve_rejects_overlapping_pendings_and_notifies()
    {
        Queue::fake();
        $slot = $this->slot();
        $first = FacilityBooking::factory()->create(['facility_id' => $this->hall->id, 'booked_by' => $this->warga->id, 'status' => 'pending'] + $slot);
        $second = FacilityBooking::factory()->create(['facility_id' => $this->hall->id, 'status' => 'pending'] + $slot);

        $this->actingAs($this->admin)->postJson("/api/bookings/{$first->id}/approve")
            ->assertStatus(200)->assertJsonPath('data.status', 'approved');

        $this->assertEquals('rejected', $second->fresh()->status);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $this->warga->id]);
        Queue::assertPushed(SendBookingWhatsappJob::class);
    }

    public function test_second_approve_on_same_slot_fails()
    {
        $slot = $this->slot();
        $first = FacilityBooking::factory()->create(['facility_id' => $this->hall->id, 'status' => 'pending'] + $slot);
        $second = FacilityBooking::factory()->create(['facility_id' => $this->hall->id, 'status' => 'pending'] + $slot);

        $this->actingAs($this->admin)->postJson("/api/bookings/{$first->id}/approve")->assertStatus(200);
        // Second is now auto-rejected; approving a decided booking fails.
        $this->actingAs($this->admin)->postJson("/api/bookings/{$second->id}/approve")->assertStatus(422);
    }

    public function test_paid_mapped_facility_creates_one_bill_on_approve()
    {
        $dueType = DueType::factory()->create(['name' => 'Sewa Aula']);
        $paid = Facility::factory()->create(['rental_fee' => 150000, 'due_type_id' => $dueType->id]);
        $slot = $this->slot(2);
        $booking = FacilityBooking::factory()->create(['facility_id' => $paid->id, 'booked_by' => $this->warga->id, 'status' => 'pending'] + $slot);

        $this->actingAs($this->admin)->postJson("/api/bookings/{$booking->id}/approve")->assertStatus(200);

        $this->assertDatabaseHas('bills', [
            'due_type_id' => $dueType->id,
            'amount_due' => 150000,
            'status' => 'belum_lunas',
        ]);
        $this->assertEquals(1, Bill::where('due_type_id', $dueType->id)->count());
    }

    public function test_unmapped_paid_facility_approves_without_bill()
    {
        $paid = Facility::factory()->create(['rental_fee' => 50000, 'due_type_id' => null]);
        $slot = $this->slot(3);
        $booking = FacilityBooking::factory()->create(['facility_id' => $paid->id, 'booked_by' => $this->warga->id, 'status' => 'pending'] + $slot);

        $this->actingAs($this->admin)->postJson("/api/bookings/{$booking->id}/approve")->assertStatus(200);
        $this->assertEquals(0, Bill::count());
    }

    public function test_warga_cannot_review_but_can_cancel_own()
    {
        $slot = $this->slot(4);
        $booking = FacilityBooking::factory()->create(['facility_id' => $this->hall->id, 'booked_by' => $this->warga->id, 'status' => 'pending'] + $slot);

        $this->actingAs($this->warga)->postJson("/api/bookings/{$booking->id}/approve")->assertStatus(403);
        $this->actingAs($this->warga)->postJson("/api/bookings/{$booking->id}/cancel")->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled');
    }
}
