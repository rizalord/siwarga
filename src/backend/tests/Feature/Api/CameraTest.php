<?php

namespace Tests\Feature\Api;

use App\Models\Camera;
use App\Models\CameraSnapshot;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CameraTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $satpam;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $this->satpam = User::factory()->create();
        $this->satpam->roles()->attach(Role::where('name', 'satpam')->first()->id);
        $this->satpam->load('roles.permissions');

        Storage::fake('public');
    }

    public function test_admin_can_crud_cameras()
    {
        $created = $this->actingAs($this->admin)->postJson('/api/cameras', [
            'name' => 'Gerbang Utama',
            'location' => 'Pintu masuk',
            'ftp_user' => 'tapo-gerbang',
            'camera_type' => 'tapo',
        ])->assertStatus(201)->assertJsonPath('data.name', 'Gerbang Utama')->json('data');

        // Duplicate ftp_user fails.
        $this->actingAs($this->admin)->postJson('/api/cameras', [
            'name' => 'Duplikat',
            'ftp_user' => 'tapo-gerbang',
        ])->assertStatus(422);

        $this->actingAs($this->admin)->putJson("/api/cameras/{$created['id']}", [
            'location' => 'Pintu masuk blok A',
        ])->assertStatus(200);

        $this->actingAs($this->admin)->deleteJson("/api/cameras/{$created['id']}")->assertStatus(200);
        $this->assertSoftDeleted('cameras', ['id' => $created['id']]);
    }

    public function test_satpam_can_view_but_not_manage()
    {
        Camera::factory()->create();

        $this->actingAs($this->satpam)->getJson('/api/cameras')->assertStatus(200);
        $this->actingAs($this->satpam)->postJson('/api/cameras', ['name' => 'X'])->assertStatus(403);
    }

    public function test_simulate_writes_and_ingests_snapshot()
    {
        config()->set('cctv.inbox_path', 'inbox');
        $camera = Camera::factory()->create(['camera_type' => 'simulator']);

        $response = $this->actingAs($this->admin)->postJson("/api/cameras/{$camera->id}/simulate", [
            'count' => 2,
        ]);

        $response->assertStatus(201)->assertJsonCount(2, 'data');
        $this->assertDatabaseCount('camera_snapshots', 2);
        $this->assertEquals(0, CameraSnapshot::where('event_type', '!=', CameraSnapshot::EVENT_SIMULATED)->count());
    }

    public function test_simulate_count_zero_is_rejected()
    {
        $camera = Camera::factory()->create(['camera_type' => 'simulator']);

        $this->actingAs($this->admin)->postJson("/api/cameras/{$camera->id}/simulate", [
            'count' => 0,
        ])->assertStatus(422);
        $this->assertDatabaseCount('camera_snapshots', 0);
    }

    public function test_simulate_inactive_camera_is_rejected()
    {
        $camera = Camera::factory()->create(['camera_type' => 'simulator', 'is_active' => false]);

        $this->actingAs($this->admin)->postJson("/api/cameras/{$camera->id}/simulate")
            ->assertStatus(422);
        $this->assertDatabaseCount('camera_snapshots', 0);
    }

    public function test_simulate_blocked_in_production()
    {
        $camera = Camera::factory()->create(['camera_type' => 'simulator']);
        app()->detectEnvironment(fn () => 'production');

        $this->actingAs($this->admin)->postJson("/api/cameras/{$camera->id}/simulate")
            ->assertStatus(403);
    }
}
