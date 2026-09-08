<?php

namespace Tests\Feature\Api;

use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\House;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WargaAnnouncementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $warga;

    protected House $wargaHouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $resident = Resident::factory()->create();
        $this->wargaHouse = House::factory()->create();
        $this->wargaHouse->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);

        $this->warga = User::factory()->create(['resident_id' => $resident->id]);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    public function test_warga_sees_broadcast_and_own_house_targeted_announcements()
    {
        Announcement::factory()->create(['title' => 'Broadcast Info', 'published_at' => now()]);
        $targeted = Announcement::factory()->create(['title' => 'Target Rumah Saya', 'published_at' => now()]);
        $targeted->targets()->create(['house_id' => $this->wargaHouse->id]);

        $otherHouse = House::factory()->create();
        $other = Announcement::factory()->create(['title' => 'Rumah Lain', 'published_at' => now()]);
        $other->targets()->create(['house_id' => $otherHouse->id]);

        Announcement::factory()->create(['title' => 'Draft Belum Publish', 'published_at' => null]);

        $response = $this->actingAs($this->warga)->getJson('/api/warga/announcements');

        $response->assertStatus(200);
        $titles = collect($response->json('data'))->pluck('title')->all();
        $this->assertContains('Broadcast Info', $titles);
        $this->assertContains('Target Rumah Saya', $titles);
        $this->assertNotContains('Rumah Lain', $titles);
        $this->assertNotContains('Draft Belum Publish', $titles);
    }

    public function test_warga_cannot_open_non_targeted_announcement()
    {
        $otherHouse = House::factory()->create();
        $announcement = Announcement::factory()->create(['published_at' => now()]);
        $announcement->targets()->create(['house_id' => $otherHouse->id]);

        $response = $this->actingAs($this->warga)->getJson("/api/warga/announcements/{$announcement->id}");

        $response->assertStatus(403);
    }

    public function test_show_records_read_receipt_idempotently()
    {
        $announcement = Announcement::factory()->create(['published_at' => now()]);

        $this->actingAs($this->warga)->getJson("/api/warga/announcements/{$announcement->id}")->assertStatus(200)
            ->assertJsonPath('data.is_read', true);
        $this->actingAs($this->warga)->getJson("/api/warga/announcements/{$announcement->id}")->assertStatus(200);

        $this->assertEquals(1, AnnouncementRead::where('announcement_id', $announcement->id)->where('user_id', $this->warga->id)->count());
    }

    public function test_index_handles_array_and_scalar_category_filter()
    {
        Announcement::factory()->create(['title' => 'Umum Info', 'category' => 'umum', 'published_at' => now()]);
        Announcement::factory()->create(['title' => 'Kegiatan Info', 'category' => 'kegiatan', 'published_at' => now()]);

        $arrayResponse = $this->actingAs($this->warga)->getJson('/api/warga/announcements?category[]=umum');

        $arrayResponse->assertStatus(200);
        $arrayTitles = collect($arrayResponse->json('data'))->pluck('title')->all();
        $this->assertContains('Umum Info', $arrayTitles);
        $this->assertNotContains('Kegiatan Info', $arrayTitles);

        $scalarResponse = $this->actingAs($this->warga)->getJson('/api/warga/announcements?category=umum');

        $scalarResponse->assertStatus(200);
        $scalarTitles = collect($scalarResponse->json('data'))->pluck('title')->all();
        $this->assertContains('Umum Info', $scalarTitles);
        $this->assertNotContains('Kegiatan Info', $scalarTitles);

        $multiResponse = $this->actingAs($this->warga)->getJson('/api/warga/announcements?category[]=umum&category[]=kegiatan');

        $multiResponse->assertStatus(200);
        $multiTitles = collect($multiResponse->json('data'))->pluck('title')->all();
        $this->assertContains('Umum Info', $multiTitles);
        $this->assertContains('Kegiatan Info', $multiTitles);
    }

    public function test_admin_bypasses_target_filter_without_recording_read()
    {
        $otherHouse = House::factory()->create();
        $announcement = Announcement::factory()->create(['published_at' => now()]);
        $announcement->targets()->create(['house_id' => $otherHouse->id]);

        $this->actingAs($this->admin)->getJson('/api/warga/announcements')->assertStatus(200)
            ->assertJsonCount(1, 'data');
        $this->actingAs($this->admin)->getJson("/api/warga/announcements/{$announcement->id}")->assertStatus(200);
        $this->assertEquals(0, AnnouncementRead::where('announcement_id', $announcement->id)->count());
    }
}
