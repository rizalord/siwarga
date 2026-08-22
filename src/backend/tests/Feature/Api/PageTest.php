<?php

namespace Tests\Feature\Api;

use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PageTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $this->warga = User::factory()->create();
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    public function test_admin_can_show_a_page_by_slug()
    {
        Page::factory()->create(['slug' => 'kontak', 'title' => 'Kontak']);

        $response = $this->actingAs($this->admin)->getJson('/api/pages/kontak');

        $response->assertStatus(200)->assertJsonPath('data.slug', 'kontak');
    }

    public function test_show_returns_404_for_unknown_slug()
    {
        $response = $this->actingAs($this->admin)->getJson('/api/pages/does-not-exist');

        $response->assertStatus(404);
    }

    public function test_admin_can_update_page_content()
    {
        $page = Page::factory()->create(['slug' => 'kontak']);

        $response = $this->actingAs($this->admin)->putJson('/api/pages/kontak', [
            'title' => 'Hubungi Kami',
            'content' => '<p>Alamat kami.</p>',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Hubungi Kami')
            ->assertJsonPath('data.content', '<p>Alamat kami.</p>');
        $this->assertDatabaseHas('pages', ['id' => $page->id, 'title' => 'Hubungi Kami']);
    }

    public function test_updating_page_content_sanitizes_html()
    {
        Page::factory()->create(['slug' => 'kontak']);

        $response = $this->actingAs($this->admin)->putJson('/api/pages/kontak', [
            'content' => '<p>Halo</p><script>alert(1)</script>',
        ]);

        $response->assertStatus(200);
        $this->assertStringNotContainsString('<script>', $response->json('data.content'));
    }

    public function test_updating_page_sets_updated_by()
    {
        Page::factory()->create(['slug' => 'kontak']);

        $this->actingAs($this->admin)->putJson('/api/pages/kontak', ['title' => 'Baru']);

        $this->assertDatabaseHas('pages', ['slug' => 'kontak', 'updated_by' => $this->admin->id]);
    }

    public function test_admin_can_upload_hero_image()
    {
        Storage::fake('public');
        Page::factory()->create(['slug' => 'home']);
        $image = UploadedFile::fake()->image('hero.jpg');

        $response = $this->actingAs($this->admin)->post('/api/pages/home', [
            '_method' => 'PUT',
            'title' => 'Beranda',
            'hero_image' => $image,
        ]);

        $response->assertStatus(200);
        $path = $response->json('data.hero_image_url');
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists(
            str_replace(Storage::disk('public')->url(''), '', parse_url($path, PHP_URL_PATH))
        );
    }

    public function test_warga_cannot_update_a_page()
    {
        Page::factory()->create(['slug' => 'kontak']);

        $response = $this->actingAs($this->warga)->putJson('/api/pages/kontak', ['title' => 'Baru']);

        $response->assertStatus(403);
    }

    public function test_warga_cannot_view_a_page_via_admin_endpoint()
    {
        Page::factory()->create(['slug' => 'kontak']);

        $response = $this->actingAs($this->warga)->getJson('/api/pages/kontak');

        $response->assertStatus(403);
    }
}
