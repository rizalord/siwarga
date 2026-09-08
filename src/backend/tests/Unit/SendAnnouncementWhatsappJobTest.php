<?php

namespace Tests\Unit;

use App\Jobs\SendAnnouncementWhatsappJob;
use App\Models\Announcement;
use App\Models\House;
use App\Models\Resident;
use App\Services\WahaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class SendAnnouncementWhatsappJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_sends_to_all_residents_with_a_phone_number_when_no_targets()
    {
        Http::fake(['*/api/sendText' => Http::response(['id' => 'x'], 200)]);
        Resident::factory()->create(['phone_number' => '081111111111']);
        Resident::factory()->create(['phone_number' => '082222222222']);
        Resident::factory()->create(['phone_number' => null]);
        $announcement = Announcement::factory()->create(['title' => 'Info Penting']);

        (new SendAnnouncementWhatsappJob($announcement))->handle(app(WahaService::class));

        Http::assertSentCount(2);
    }

    public function test_sends_only_to_targeted_houses_current_residents()
    {
        Http::fake(['*/api/sendText' => Http::response(['id' => 'x'], 200)]);

        $targetedHouse = House::factory()->create();
        $targetedResident = Resident::factory()->create(['phone_number' => '081111111111']);
        $targetedHouse->residents()->attach($targetedResident->id, ['start_date' => now()->subMonth()]);

        $untargetedHouse = House::factory()->create();
        $untargetedResident = Resident::factory()->create(['phone_number' => '082222222222']);
        $untargetedHouse->residents()->attach($untargetedResident->id, ['start_date' => now()->subMonth()]);

        $announcement = Announcement::factory()->create();
        $announcement->targets()->create(['house_id' => $targetedHouse->id]);

        (new SendAnnouncementWhatsappJob($announcement))->handle(app(WahaService::class));

        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => $request['chatId'] === '6281111111111@c.us');
    }

    public function test_a_failed_send_does_not_abort_the_rest()
    {
        Log::spy();
        Http::fakeSequence()
            ->push(['error' => 'fail'], 500)
            ->push(['id' => 'ok'], 200);
        Resident::factory()->create(['phone_number' => '081111111111']);
        Resident::factory()->create(['phone_number' => '082222222222']);
        $announcement = Announcement::factory()->create();

        (new SendAnnouncementWhatsappJob($announcement))->handle(app(WahaService::class));

        Http::assertSentCount(2);
        Log::shouldHaveReceived('warning')->once();
    }
}
