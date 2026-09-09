<?php

namespace Tests\Feature\Api;

use App\Models\Event;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EventAdminTest extends TestCase
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

    public function test_admin_can_crud_events_with_unique_slugs()
    {
        $created = $this->actingAs($this->admin)->postJson('/api/events', [
            'title' => 'Kerja Bakti',
            'description' => '<p>Bawa cangkul.</p>',
            'starts_at' => now()->addWeek()->toDateTimeString(),
            'is_public' => true,
        ])->assertStatus(201)->assertJsonPath('data.slug', 'kerja-bakti')->json('data');

        $again = $this->actingAs($this->admin)->postJson('/api/events', [
            'title' => 'Kerja Bakti',
            'starts_at' => now()->addWeeks(2)->toDateTimeString(),
        ])->assertStatus(201)->json('data');
        $this->assertEquals('kerja-bakti-2', $again['slug']);

        $this->actingAs($this->admin)->putJson("/api/events/{$created['id']}", ['status' => 'ongoing'])
            ->assertStatus(200)->assertJsonPath('data.status', 'ongoing');
        $this->actingAs($this->admin)->deleteJson("/api/events/{$created['id']}")->assertStatus(200);
        $this->assertSoftDeleted('events', ['id' => $created['id']]);
    }

    public function test_warga_cannot_manage_events()
    {
        $this->actingAs($this->warga)->postJson('/api/events', ['title' => 'X'])->assertStatus(403);
    }

    public function test_gallery_enforces_count_and_type_limits()
    {
        Storage::fake('public');
        $event = Event::factory()->create();
        $photo = fn () => UploadedFile::fake()->image('galeri.jpg', 800, 600)->size(500);

        for ($i = 0; $i < 5; $i++) {
            $this->actingAs($this->admin)->postJson("/api/events/{$event->id}/documentation", [
                'photo' => $photo(), 'media_type' => 'foto',
            ])->assertStatus(201);
        }

        $this->actingAs($this->admin)->postJson("/api/events/{$event->id}/documentation", [
            'photo' => $photo(), 'media_type' => 'foto',
        ])->assertStatus(422);

        $id = $event->documentation()->first()->id;
        $this->actingAs($this->admin)->deleteJson("/api/event-documentation/{$id}")->assertStatus(200);
    }
}
