<?php

namespace Tests\Feature\Api;

use App\Models\Camera;
use App\Models\CameraSnapshot;
use App\Models\PanicAlert;
use App\Models\Role;
use App\Models\User;
use App\Services\CameraIngestService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CameraIngestTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $satpam;

    protected User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        foreach (['admin', 'satpam', 'warga'] as $role) {
            $this->{$role} = User::factory()->create();
            $this->{$role}->roles()->attach(Role::where('name', $role)->first()->id);
            $this->{$role}->load('roles.permissions');
        }

        Storage::fake('public');
    }

    protected function inboxFor(Camera $camera): string
    {
        $dir = "inbox/{$camera->ftp_user}";
        Storage::disk('public')->makeDirectory($dir);

        return $dir;
    }

    public function test_ingest_stores_snapshot_and_notifies_staff()
    {
        config()->set('cctv.inbox_path', 'inbox');
        $camera = Camera::factory()->create();
        Storage::disk('public')->put("{$this->inboxFor($camera)}/motion-001.jpg", 'fake-image-bytes');

        $summary = app(CameraIngestService::class)->ingest($camera->id);

        $this->assertSame(1, $summary['processed']);
        $this->assertDatabaseHas('camera_snapshots', ['camera_id' => $camera->id]);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $this->satpam->id]);
        Storage::disk('public')->assertExists("inbox/{$camera->ftp_user}/.done/motion-001.jpg");
    }

    public function test_reingest_same_file_is_noop()
    {
        config()->set('cctv.inbox_path', 'inbox');
        $camera = Camera::factory()->create();
        Storage::disk('public')->put("{$this->inboxFor($camera)}/motion-001.jpg", 'fake-image-bytes');

        $service = app(CameraIngestService::class);
        $service->ingest($camera->id);
        $summary = $service->ingest($camera->id);

        $this->assertSame(0, $summary['processed']);
        $this->assertEquals(1, CameraSnapshot::count());
    }

    public function test_reuploaded_file_is_skipped_by_hash()
    {
        config()->set('cctv.inbox_path', 'inbox');
        $camera = Camera::factory()->create();
        Storage::disk('public')->put("{$this->inboxFor($camera)}/motion-001.jpg", 'fake-image-bytes');

        $service = app(CameraIngestService::class);
        $service->ingest($camera->id);

        Storage::disk('public')->put("{$this->inboxFor($camera)}/motion-001.jpg", 'fake-image-bytes');
        $summary = $service->ingest($camera->id);

        $this->assertSame(1, $summary['skipped']);
        $this->assertEquals(1, CameraSnapshot::count());
    }

    public function test_invalid_files_go_to_quarantine()
    {
        config()->set('cctv.inbox_path', 'inbox');
        $camera = Camera::factory()->create();
        Storage::disk('public')->put("{$this->inboxFor($camera)}/notes.txt", 'not-an-image');

        $summary = app(CameraIngestService::class)->ingest($camera->id);

        $this->assertSame(1, $summary['quarantined']);
        $this->assertEquals(0, CameraSnapshot::count());
        Storage::disk('public')->assertExists("inbox/{$camera->ftp_user}/.quarantine/notes.txt");
    }

    public function test_panic_window_marks_snapshot_panic()
    {
        config()->set('cctv.inbox_path', 'inbox');
        $camera = Camera::factory()->create();
        PanicAlert::factory()->create(['status' => 'active', 'created_at' => now()->subMinutes(2)]);
        Storage::disk('public')->put("{$this->inboxFor($camera)}/motion-002.jpg", 'bytes');

        app(CameraIngestService::class)->ingest($camera->id);

        $this->assertDatabaseHas('camera_snapshots', [
            'camera_id' => $camera->id,
            'event_type' => 'panic',
        ]);
    }

    public function test_warga_cannot_view_snapshots_but_satpam_can()
    {
        $snapshot = CameraSnapshot::factory()->create();

        $this->actingAs($this->warga)->getJson("/api/camera-snapshots/{$snapshot->id}")->assertStatus(403);
        $this->actingAs($this->satpam)->getJson("/api/camera-snapshots/{$snapshot->id}")->assertStatus(200);
        $this->assertDatabaseHas('camera_access_logs', [
            'snapshot_id' => $snapshot->id,
            'user_id' => $this->satpam->id,
        ]);
    }

    public function test_delete_removes_row_and_file()
    {
        $snapshot = CameraSnapshot::factory()->create(['file_path' => 'camera-snapshots/1/gone.jpg']);
        Storage::disk('public')->put('camera-snapshots/1/gone.jpg', 'bytes');

        $this->actingAs($this->admin)->deleteJson("/api/camera-snapshots/{$snapshot->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('camera_snapshots', ['id' => $snapshot->id]);
        Storage::disk('public')->assertMissing('camera-snapshots/1/gone.jpg');
    }
}
