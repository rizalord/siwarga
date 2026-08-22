<?php

namespace Tests\Feature\Api;

use App\Models\Announcement;
use App\Models\Event;
use App\Models\EventDocumentation;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_page_endpoint_requires_no_auth()
    {
        Page::factory()->create(['slug' => 'home', 'title' => 'Beranda', 'content' => '<p>Selamat datang.</p>']);

        $response = $this->getJson('/api/public/pages/home');

        $response->assertStatus(200)
            ->assertJsonPath('data.slug', 'home')
            ->assertJsonPath('data.title', 'Beranda');
    }

    public function test_public_page_endpoint_returns_404_for_unknown_slug()
    {
        $response = $this->getJson('/api/public/pages/tidak-ada');

        $response->assertStatus(404);
    }

    public function test_public_page_resource_does_not_expose_admin_fields()
    {
        Page::factory()->create(['slug' => 'home']);

        $response = $this->getJson('/api/public/pages/home');

        $response->assertJsonMissingPath('data.updated_by')
            ->assertJsonMissingPath('data.id');
    }

    public function test_public_announcements_index_only_returns_published_public_announcements()
    {
        Announcement::factory()->create(['is_public' => true, 'published_at' => now()->subDay(), 'title' => 'Terlihat']);
        Announcement::factory()->create(['is_public' => false, 'published_at' => now()->subDay(), 'title' => 'Privat']);
        Announcement::factory()->create(['is_public' => true, 'published_at' => now()->addDay(), 'title' => 'Belum Terbit']);

        $response = $this->getJson('/api/public/announcements');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['title' => 'Terlihat']);
    }

    public function test_public_announcement_show_returns_404_for_private_announcement()
    {
        Announcement::factory()->create(['slug' => 'privat', 'is_public' => false]);

        $response = $this->getJson('/api/public/announcements/privat');

        $response->assertStatus(404);
    }

    public function test_public_announcement_show_returns_the_announcement()
    {
        Announcement::factory()->create(['slug' => 'kerja-bakti', 'is_public' => true, 'published_at' => now()->subHour(), 'title' => 'Kerja Bakti']);

        $response = $this->getJson('/api/public/announcements/kerja-bakti');

        $response->assertStatus(200)->assertJsonPath('data.title', 'Kerja Bakti');
    }

    public function test_public_events_index_only_returns_public_events()
    {
        Event::factory()->create(['is_public' => true, 'title' => 'Terlihat', 'starts_at' => now()->addDay()]);
        Event::factory()->create(['is_public' => false, 'title' => 'Privat', 'starts_at' => now()->addDay()]);

        $response = $this->getJson('/api/public/events');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['title' => 'Terlihat']);
    }

    public function test_public_event_show_returns_404_for_private_event()
    {
        Event::factory()->create(['slug' => 'privat', 'is_public' => false]);

        $response = $this->getJson('/api/public/events/privat');

        $response->assertStatus(404);
    }

    public function test_public_event_show_includes_documentation()
    {
        $event = Event::factory()->create(['slug' => 'kerja-bakti', 'is_public' => true]);
        EventDocumentation::factory()->create(['event_id' => $event->id, 'media_type' => 'foto', 'caption' => 'Dokumentasi']);

        $response = $this->getJson('/api/public/events/kerja-bakti');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.documentation')
            ->assertJsonPath('data.documentation.0.caption', 'Dokumentasi');
    }

    public function test_public_contact_form_creates_a_message()
    {
        $response = $this->postJson('/api/public/contact', [
            'name' => 'Budi',
            'email' => 'budi@example.com',
            'phone' => '081234567890',
            'message' => 'Halo, saya ingin bertanya soal jadwal kerja bakti.',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('contact_messages', ['name' => 'Budi', 'status' => 'new']);
    }

    public function test_public_contact_form_validates_required_fields()
    {
        $response = $this->postJson('/api/public/contact', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['name', 'message']);
    }

    public function test_public_contact_form_is_rate_limited()
    {
        $payload = ['name' => 'Budi', 'message' => 'Halo'];

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/public/contact', $payload)->assertStatus(201);
        }

        $this->postJson('/api/public/contact', $payload)->assertStatus(429);
    }
}
