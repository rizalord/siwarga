<?php

namespace Tests\Feature\Api;

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
}
