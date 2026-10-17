<?php

namespace Tests\Feature\Api;

use App\Jobs\SendBillReminderWhatsappJob;
use App\Models\Bill;
use App\Models\Resident;
use App\Models\User;
use App\Notifications\BillDueReminder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class BillReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_reminds_only_unpaid_bills_due_in_three_days()
    {
        Notification::fake();
        Queue::fake();

        $resident = Resident::factory()->create(['phone_number' => '081234567890']);
        $user = User::factory()->create(['resident_id' => $resident->id]);

        $due = Bill::factory()->create(['resident_id' => $resident->id, 'status' => 'belum_lunas', 'period_end' => now()->addDays(3)->toDateString()]);
        Bill::factory()->create(['resident_id' => $resident->id, 'status' => 'lunas', 'period_end' => now()->addDays(3)->toDateString()]);
        Bill::factory()->create(['resident_id' => $resident->id, 'status' => 'belum_lunas', 'period_end' => now()->addDays(5)->toDateString()]);

        $this->artisan('bills:remind-due')->assertSuccessful();

        Notification::assertSentToTimes($user, BillDueReminder::class, 1);
        Notification::assertSentTo($user, BillDueReminder::class, fn ($n) => $n->billId === $due->id);
        Queue::assertPushed(SendBillReminderWhatsappJob::class, 1);
    }

    public function test_skips_whatsapp_when_resident_has_no_phone()
    {
        Notification::fake();
        Queue::fake();

        $resident = Resident::factory()->create(['phone_number' => null]);
        User::factory()->create(['resident_id' => $resident->id]);
        Bill::factory()->create(['resident_id' => $resident->id, 'status' => 'belum_lunas', 'period_end' => now()->addDays(3)->toDateString()]);

        $this->artisan('bills:remind-due')->assertSuccessful();

        Queue::assertNotPushed(SendBillReminderWhatsappJob::class);
    }
}
