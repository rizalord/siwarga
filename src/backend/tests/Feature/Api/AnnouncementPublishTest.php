<?php

namespace Tests\Feature\Api;

use App\Jobs\SendAnnouncementWhatsappJob;
use App\Models\Announcement;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AnnouncementPublishTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_publish_announcement()
    {
        Queue::fake();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $admin->load('roles.permissions');
        $announcement = Announcement::factory()->create(['published_at' => null]);

        $response = $this->actingAs($admin)->postJson("/api/announcements/{$announcement->id}/publish");

        $response->assertStatus(200);
        Queue::assertPushed(SendAnnouncementWhatsappJob::class, fn ($job) => $job->announcement->is($announcement));
        $this->assertNotNull($announcement->fresh()->published_at);
    }

    public function test_bendahara_cannot_publish_non_keuangan_announcement()
    {
        Queue::fake();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $bendahara = User::factory()->create();
        $bendahara->roles()->attach(Role::where('name', 'bendahara')->first()->id);
        $bendahara->load('roles.permissions');
        $announcement = Announcement::factory()->create(['category' => 'umum']);

        $response = $this->actingAs($bendahara)->postJson("/api/announcements/{$announcement->id}/publish");

        $response->assertStatus(403);
        Queue::assertNotPushed(SendAnnouncementWhatsappJob::class);
    }
}
