<?php

namespace Tests\Feature\Api;

use App\Models\Announcement;
use App\Models\House;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $bendahara;

    protected User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $this->bendahara = User::factory()->create();
        $this->bendahara->roles()->attach(Role::where('name', 'bendahara')->first()->id);
        $this->bendahara->load('roles.permissions');

        $this->warga = User::factory()->create();
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    public function test_admin_can_list_announcements()
    {
        Announcement::factory()->count(3)->create();

        $response = $this->actingAs($this->admin)->getJson('/api/announcements');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_admin_can_create_announcement_with_targets()
    {
        $houses = House::factory()->count(2)->create();

        $response = $this->actingAs($this->admin)->postJson('/api/announcements', [
            'title' => 'Kerja Bakti Bulanan',
            'content' => '<p>Ayo gotong royong.</p>',
            'category' => 'kegiatan',
            'is_public' => true,
            'target_house_ids' => $houses->pluck('id')->all(),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Kerja Bakti Bulanan')
            ->assertJsonPath('data.slug', 'kerja-bakti-bulanan');
        $this->assertCount(2, $response->json('data.target_house_ids'));
        $this->assertDatabaseHas('announcements', ['title' => 'Kerja Bakti Bulanan', 'created_by' => $this->admin->id]);
    }

    public function test_creating_announcement_sanitizes_content()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/announcements', [
            'title' => 'Test',
            'content' => '<p>Halo</p><script>alert(1)</script>',
            'category' => 'umum',
        ]);

        $response->assertStatus(201);
        $this->assertStringNotContainsString('<script>', $response->json('data.content'));
    }

    public function test_duplicate_titles_get_unique_slugs()
    {
        $this->actingAs($this->admin)->postJson('/api/announcements', [
            'title' => 'Rapat RT', 'content' => '<p>A</p>', 'category' => 'umum',
        ]);
        $response = $this->actingAs($this->admin)->postJson('/api/announcements', [
            'title' => 'Rapat RT', 'content' => '<p>B</p>', 'category' => 'umum',
        ]);

        $response->assertJsonPath('data.slug', 'rapat-rt-2');
    }

    public function test_bendahara_can_create_keuangan_announcement()
    {
        $response = $this->actingAs($this->bendahara)->postJson('/api/announcements', [
            'title' => 'Laporan Keuangan', 'content' => '<p>A</p>', 'category' => 'keuangan',
        ]);

        $response->assertStatus(201);
    }

    public function test_bendahara_cannot_create_non_keuangan_announcement()
    {
        $response = $this->actingAs($this->bendahara)->postJson('/api/announcements', [
            'title' => 'Pengumuman Umum', 'content' => '<p>A</p>', 'category' => 'umum',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['category']);
    }

    public function test_bendahara_cannot_update_non_keuangan_announcement()
    {
        $announcement = Announcement::factory()->create(['category' => 'umum']);

        $response = $this->actingAs($this->bendahara)->putJson("/api/announcements/{$announcement->id}", [
            'title' => 'Diubah',
        ]);

        $response->assertStatus(403);
    }

    public function test_bendahara_cannot_move_keuangan_announcement_to_another_category()
    {
        $announcement = Announcement::factory()->create(['category' => 'keuangan']);

        $response = $this->actingAs($this->bendahara)->putJson("/api/announcements/{$announcement->id}", [
            'category' => 'umum',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['category']);
    }

    public function test_warga_cannot_create_announcement()
    {
        $response = $this->actingAs($this->warga)->postJson('/api/announcements', [
            'title' => 'Test', 'content' => '<p>A</p>', 'category' => 'umum',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_update_announcement()
    {
        $announcement = Announcement::factory()->create(['title' => 'Lama']);

        $response = $this->actingAs($this->admin)->putJson("/api/announcements/{$announcement->id}", [
            'title' => 'Baru',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.title', 'Baru');
    }

    public function test_admin_can_soft_delete_announcement()
    {
        $announcement = Announcement::factory()->create();

        $response = $this->actingAs($this->admin)->deleteJson("/api/announcements/{$announcement->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('announcements', ['id' => $announcement->id]);
    }

    public function test_can_filter_announcements_by_single_and_array_category()
    {
        Announcement::factory()->create(['category' => 'umum']);
        Announcement::factory()->create(['category' => 'keuangan']);
        Announcement::factory()->create(['category' => 'kegiatan']);

        $single = $this->actingAs($this->admin)->getJson('/api/announcements?category=umum');

        $single->assertStatus(200)->assertJsonCount(1, 'data');
        $this->assertSame('umum', $single->json('data.0.category'));

        $multiple = $this->actingAs($this->admin)->getJson('/api/announcements?category[]=umum&category[]=keuangan');

        $multiple->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_update_rejects_empty_title()
    {
        $announcement = Announcement::factory()->create();

        $response = $this->actingAs($this->admin)->putJson("/api/announcements/{$announcement->id}", [
            'title' => '',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['title']);
    }
}
