<?php

namespace Tests\Feature\Api;

use App\Models\AnonymousSuggestion;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuggestionTest extends TestCase
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

    public function test_warga_can_submit_anonymously_with_no_identity_stored()
    {
        $response = $this->actingAs($this->warga)->postJson('/api/suggestions', [
            'content' => 'Mohon jadwal ronda ditempel di pos.',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.status', 'new');
        $payload = $response->json('data');
        $this->assertArrayNotHasKey('user_id', $payload);
        $this->assertArrayNotHasKey('reported_by', $payload);
        $this->assertDatabaseHas('anonymous_suggestions', ['status' => 'new']);
    }

    public function test_warga_cannot_view_inbox_but_admin_can_review()
    {
        AnonymousSuggestion::create(['content' => 'Saran A']);

        $this->actingAs($this->warga)->getJson('/api/suggestions')->assertStatus(403);

        $this->actingAs($this->admin)->getJson('/api/suggestions')->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $id = AnonymousSuggestion::first()->id;
        $this->actingAs($this->admin)->postJson("/api/suggestions/{$id}/mark-reviewed")
            ->assertStatus(200)->assertJsonPath('data.status', 'reviewed');
    }
}
