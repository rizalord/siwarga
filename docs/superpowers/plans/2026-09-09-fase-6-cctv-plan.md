# Fase 6 CCTV Event-Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build FTP-inbox CCTV event ingest (per-minute scheduler scan, snapshot log, staff notifications, panic-window correlation + WA), camera admin CRUD, dev simulator, access-logged gallery UI, and tests — backend API + React UI, no new hardware, no live streaming.

**Architecture:** `CameraIngestService` holds all file logic (unit-testable with `Storage::fake`, no FTP server needed); thin `camera:ingest` command scheduled everyMinute in `routes/console.php`; motion snapshots DB-notify staff, panic-window matches additionally dispatch the WA job after the row exists; snapshot `show` writes access logs, `destroy` deletes row + files (Fase 3 gallery lesson).

**Tech Stack:** Laravel 13, PHPUnit, MySQL, React 19 + TanStack Query/Router, existing database notifications + `WahaService` (`tries = 3` job), public disk.

**Spec:** `docs/superpowers/specs/2026-09-09-fase-6-cctv-design.md` (all sections approved by user).

## Global Constraints

- Follow Pint formatting (`vendor/bin/pint --dirty --format agent`) before each PHP commit.
- Every change must be programmatically tested (TDD: failing test first, then minimal implementation).
- Idempotency: same source file twice → no-op (exactly one row per `source_hash`).
- NEVER delete/move-away source before success: copy to storage first, then move original to `.done/`; invalid → `.quarantine/` + warning log.
- Motion → DB only; panic-correlated → DB + WA. Never assert WA delivery — assert DB/API state.
- `show` writes access log; `destroy` removes row + stored file (+ `.done/` source best-effort).
- Warga 403 on all snapshot endpoints (panic-attachment exception is out of scope — no panic-detail change).
- Frontend toasts Bahasa Indonesia; reuse DataTable/use-table-url-state/Header-Main/useHasPermission.
- No MSW handlers for cctv — none to update. No live streaming/HLS/NVR/MQTT.

---

## File map

| File | Responsibility |
|---|---|
| `app/Models/Permission.php` | +3 permissions |
| `app/Models/Camera.php`, `CameraSnapshot.php`, `CameraAccessLog.php` (new) | models + constants |
| `app/Policies/CameraPolicy.php`, `CameraSnapshotPolicy.php` (new) | authorization |
| `database/migrations/2026_09_10_000008..000010_*` (new ×3) | cameras, snapshots, access logs |
| `config/cctv.php` (new) | `inbox_path` from `FTP_INBOX_PATH` |
| `app/Services/CameraIngestService.php` (new) | scan → validate → store → notify → correlate |
| `app/Console/Commands/CameraIngestCommand.php`, `CameraSimulateCommand.php` (new) | `camera:ingest`, `camera:simulate` |
| `routes/console.php` | everyMinute schedule |
| `app/Http/Controllers/Api/CameraController.php`, `CameraSnapshotController.php` (new) | CRUD + gallery + simulate |
| `app/Http/Resources/CameraResource.php`, `CameraSnapshotResource.php` (new) | shapes |
| `app/Notifications/CameraSnapshotStored.php` (new) | DB payload |
| `app/Jobs/SendCameraWhatsappJob.php` (new) | WA for panic snapshots |
| `routes/api.php`, `app/Providers/AppServiceProvider.php`, `database/seeders/RoleSeeder.php` | routes, gates, seeds |
| `src/backend/.env.example` | `FTP_INBOX_PATH` |
| `docker-compose.yml`, `docker-compose.prd.yml` (repo root) | `ftp` service + `ftp-data` volume + `:ro` inbox mount + `scheduler` service |
| `.env.example` (repo root) | `FTP_PORT/FTP_USER/FTP_PASS/FTP_PASV_*` |
| `src/types/api.ts`, `src/services/cctv.ts`, `src/hooks/use-cctv.ts` | TS + client + hooks |
| `src/features/siwarga-cctv/*`, `src/routes/_authenticated/cctv/index.tsx` | gallery + admin pages |
| `src/components/layout/data/sidebar-data.ts` | Keamanan entry |

---

### Task 1: cctv permissions/policies/gates/seeder + models

**Files:**
- Modify: `app/Models/Permission.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Modify: `database/seeders/RoleSeeder.php`
- Create: `app/Models/Camera.php`
- Create: `app/Models/CameraSnapshot.php`
- Create: `app/Models/CameraAccessLog.php`
- Create: `app/Policies/CameraPolicy.php`
- Create: `app/Policies/CameraSnapshotPolicy.php`
- Create: `database/factories/CameraFactory.php`
- Create: `database/factories/CameraSnapshotFactory.php`
- Test: `tests/Unit/CameraPolicyTest.php`

**Interfaces:**
- Consumes: `User::hasPermission()`, `Permission::SYSTEM_PERMISSIONS`, seeders.
- Produces: gates `cameras.view/manage`, `snapshots.view`; models + constants for Tasks 2–5.

- [ ] **Step 1: Write the failing policy tests**

```php
<?php

namespace Tests\Unit;

use App\Models\CameraSnapshot;
use App\Models\Role;
use App\Models\User;
use App\Policies\CameraPolicy;
use App\Policies\CameraSnapshotPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CameraPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function actingUser(string $role): User
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', $role)->first()->id);
        $user->load('roles.permissions');

        return $user;
    }

    public function test_admin_manages_cameras_and_views_snapshots()
    {
        $admin = $this->actingUser('admin');

        $this->assertTrue((new CameraPolicy)->create($admin));
        $this->assertTrue((new CameraSnapshotPolicy)->view($admin, new CameraSnapshot));
    }

    public function test_satpam_views_but_does_not_manage()
    {
        $satpam = $this->actingUser('satpam');

        $this->assertTrue((new CameraPolicy)->viewAny($satpam));
        $this->assertFalse((new CameraPolicy)->create($satpam));
        $this->assertTrue((new CameraSnapshotPolicy)->view($satpam, new CameraSnapshot));
    }

    public function test_warga_has_no_snapshot_access()
    {
        $warga = $this->actingUser('warga');

        $this->assertFalse((new CameraSnapshotPolicy)->view($warga, new CameraSnapshot));
        $this->assertFalse((new CameraPolicy)->viewAny($warga));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Unit/CameraPolicyTest.php`
Expected: FAIL — policy/model classes not found.

- [ ] **Step 3: Add permissions, models, policies, factories, gates, seeder**

Permissions after `'emergency-contacts.manage'`:

```php
        'emergency-contacts.manage' => 'Kelola kontak darurat',
        'cameras.view' => 'Lihat kamera CCTV',
        'cameras.manage' => 'Kelola kamera CCTV',
        'snapshots.view' => 'Lihat snapshot CCTV',
```

Models (verbatim):

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Camera extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPE_TAPO = 'tapo';

    public const TYPE_SIMULATOR = 'simulator';

    protected $fillable = [
        'name', 'location', 'ftp_user', 'camera_type', 'stream_url', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(CameraSnapshot::class);
    }
}
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CameraSnapshot extends Model
{
    use HasFactory, SoftDeletes;

    public const EVENT_MOTION = 'motion';

    public const EVENT_PANIC = 'panic';

    public const EVENT_MANUAL = 'manual';

    public const EVENT_SIMULATED = 'simulated';

    protected $fillable = [
        'camera_id', 'file_path', 'mime', 'size_bytes',
        'event_type', 'captured_at', 'source_hash',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'captured_at' => 'datetime',
        ];
    }

    public function camera(): BelongsTo
    {
        return $this->belongsTo(Camera::class);
    }

    public function accessLogs(): HasMany
    {
        return $this->hasMany(CameraAccessLog::class, 'snapshot_id');
    }
}
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CameraAccessLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['snapshot_id', 'user_id', 'viewed_at'];

    protected function casts(): array
    {
        return ['viewed_at' => 'datetime'];
    }

    public function snapshot(): BelongsTo
    {
        return $this->belongsTo(CameraSnapshot::class, 'snapshot_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

Policies (verbatim):

```php
<?php

namespace App\Policies;

use App\Models\Camera;
use App\Models\User;

class CameraPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('cameras.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('cameras.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('cameras.manage');
    }

    public function update(User $user, Camera $camera): bool
    {
        return $user->hasPermission('cameras.manage');
    }

    public function delete(User $user, Camera $camera): bool
    {
        return $user->hasPermission('cameras.manage');
    }
}
```

```php
<?php

namespace App\Policies;

use App\Models\CameraSnapshot;
use App\Models\User;

class CameraSnapshotPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('snapshots.view');
    }

    public function view(User $user, CameraSnapshot $snapshot): bool
    {
        return $user->hasPermission('snapshots.view');
    }

    public function delete(User $user, CameraSnapshot $snapshot): bool
    {
        return $user->hasPermission('cameras.manage');
    }
}
```

Factories: `CameraFactory` (name → 'Kamera Gerbang', location → 'Gerbang Utama', ftp_user → unique `'cam-'.Str::random(8)` lowercase, camera_type → tapo, stream_url → null, is_active → true); `CameraSnapshotFactory` (camera_id → Camera::factory(), file_path → 'camera-snapshots/1/dummy.jpg', mime → 'image/jpeg', size_bytes → 1024, event_type → motion, captured_at → now(), source_hash → `hash('sha256', Str::random(16))`).

Gates after the security block:

```php
        // CCTV (Fase 6)
        Gate::define('cameras.view', [CameraPolicy::class, 'viewAny']);
        Gate::define('cameras.manage', [CameraPolicy::class, 'create']);
        Gate::define('snapshots.view', [CameraSnapshotPolicy::class, 'viewAny']);
```

RoleSeeder satpam list gains `'cameras.view', 'snapshots.view',`. Warga/bendahara unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --compact tests/Unit/CameraPolicyTest.php`
Expected: PASS (3 tests).

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Models/Permission.php app/Providers/AppServiceProvider.php database/seeders/RoleSeeder.php app/Models/Camera.php app/Models/CameraSnapshot.php app/Models/CameraAccessLog.php app/Policies/CameraPolicy.php app/Policies/CameraSnapshotPolicy.php database/factories/CameraFactory.php database/factories/CameraSnapshotFactory.php tests/Unit/CameraPolicyTest.php
git commit -m "feat: add CCTV permissions, policies, and models"
```

---

### Task 2: ingest backend (migrations, service, command, snapshots API)

**Files:**
- Create: `database/migrations/2026_09_10_000008_create_cameras_table.php`
- Create: `database/migrations/2026_09_10_000009_create_camera_snapshots_table.php`
- Create: `database/migrations/2026_09_10_000010_create_camera_access_logs_table.php`
- Create: `config/cctv.php`
- Create: `app/Services/CameraIngestService.php`
- Create: `app/Console/Commands/CameraIngestCommand.php`
- Create: `app/Http/Controllers/Api/CameraSnapshotController.php`
- Create: `app/Http/Resources/CameraSnapshotResource.php`
- Create: `app/Notifications/CameraSnapshotStored.php`
- Create: `app/Jobs/SendCameraWhatsappJob.php`
- Modify: `routes/console.php`
- Modify: `routes/api.php`
- Modify: `.env.example`
- Test: `tests/Feature/Api/CameraIngestTest.php`

**Interfaces:**
- Consumes: models/policies/gates (Task 1), `PanicAlert::STATUS_ACTIVE`, `WahaService::sendMessage(string, string): bool`.
- Produces: `CameraIngestService::ingest(?int): array{processed,skipped,quarantined}`; `camera:ingest`; routes `GET /api/camera-snapshots`, `GET /api/camera-snapshots/{snapshot}`, `DELETE /api/camera-snapshots/{snapshot}`; `config('cctv.inbox_path')`.

- [ ] **Step 1: Write the failing tests**

```php
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Api/CameraIngestTest.php`
Expected: FAIL — tables don't exist.

- [ ] **Step 3: Write migrations + config + env, run migrate**

```php
// 2026_09_10_000008_create_cameras_table.php
Schema::create('cameras', function (Blueprint $table) {
    $table->id();
    $table->string('name', 100);
    $table->string('location', 255)->nullable();
    $table->string('ftp_user', 64)->unique();
    $table->string('camera_type', 20)->default('tapo');
    $table->string('stream_url', 255)->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    $table->softDeletes();
});
```

```php
// 2026_09_10_000009_create_camera_snapshots_table.php
Schema::create('camera_snapshots', function (Blueprint $table) {
    $table->id();
    $table->foreignId('camera_id')->constrained('cameras');
    $table->string('file_path', 255);
    $table->string('mime', 50);
    $table->unsignedBigInteger('size_bytes');
    $table->string('event_type', 20)->default('motion');
    $table->dateTime('captured_at')->nullable();
    $table->string('source_hash', 64)->unique();
    $table->timestamps();
    $table->softDeletes();
    $table->index(['camera_id', 'captured_at'], 'snapshots_camera_captured');
});
```

```php
// 2026_09_10_000010_create_camera_access_logs_table.php
Schema::create('camera_access_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('snapshot_id')->constrained('camera_snapshots');
    $table->foreignId('user_id')->constrained('users');
    $table->dateTime('viewed_at')->useCurrent();
    $table->index(['snapshot_id', 'user_id'], 'access_snapshot_user');
});
```

Full migration class boilerplate + `down()` drops per file. Run `php artisan migrate`.

`config/cctv.php`:

```php
<?php

return [
    'inbox_path' => env('FTP_INBOX_PATH', 'ftp-inbox'),
];
```

`src/backend/.env.example` append: `FTP_INBOX_PATH=ftp-inbox`. (Repo-root `.env.example` FTP vars are Task 5.)

- [ ] **Step 4: Write notification + WA job**

```php
<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CameraSnapshotStored extends Notification
{
    use Queueable;

    public function __construct(
        public int $snapshotId,
        public string $cameraName,
        public string $eventType,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'snapshot_id' => $this->snapshotId,
            'title' => 'Snapshot CCTV',
            'old_status' => 'none',
            'new_status' => $this->eventType,
            'actor_name' => $this->cameraName,
        ];
    }
}
```

```php
<?php

namespace App\Jobs;

use App\Models\CameraSnapshot;
use App\Models\User;
use App\Services\WahaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendCameraWhatsappJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $snapshotId) {}

    public function handle(WahaService $wahaService): void
    {
        $snapshot = CameraSnapshot::with('camera')->find($this->snapshotId);

        if ($snapshot === null) {
            return;
        }

        $staff = User::whereHas('roles', fn ($query) => $query->whereIn('name', ['admin', 'satpam']))
            ->where('is_active', true)
            ->with('resident')
            ->get();

        foreach ($staff as $member) {
            $phone = $member->resident?->phone_number;

            if (blank($phone)) {
                continue;
            }

            try {
                $wahaService->sendMessage(
                    $phone,
                    "[SIWarga] Snapshot PANIC dari {$snapshot->camera->name} ({$snapshot->captured_at?->format('d M Y H:i')}). Cek galeri CCTV."
                );
            } catch (\Throwable $exception) {
                Log::warning('SendCameraWhatsappJob: send failed', [
                    'snapshot_id' => $this->snapshotId,
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }
}
```

- [ ] **Step 5: Write the ingest service + command + schedule**

```php
<?php

namespace App\Services;

use App\Jobs\SendCameraWhatsappJob;
use App\Models\Camera;
use App\Models\CameraSnapshot;
use App\Models\PanicAlert;
use App\Models\User;
use App\Notifications\CameraSnapshotStored;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CameraIngestService
{
    public const ALLOWED_MIMES = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'mp4' => 'video/mp4',
    ];

    public const MAX_BYTES = 25 * 1024 * 1024;

    /**
     * @return array{processed: int, skipped: int, quarantined: int}
     */
    public function ingest(?int $cameraId = null): array
    {
        $summary = ['processed' => 0, 'skipped' => 0, 'quarantined' => 0];
        $disk = Storage::disk('public');
        $inbox = trim((string) config('cctv.inbox_path', 'ftp-inbox'), '/');

        $cameras = Camera::where('is_active', true)
            ->when($cameraId, fn ($query) => $query->whereKey($cameraId))
            ->get();

        foreach ($cameras as $camera) {
            foreach ($this->pendingFiles($disk, $inbox, $camera) as $path) {
                $summary[$this->ingestFile($disk, $inbox, $camera, $path)]++;
            }
        }

        return $summary;
    }

    /**
     * @return array<int, string>
     */
    private function pendingFiles(FilesystemAdapter $disk, string $inbox, Camera $camera): array
    {
        $dir = "{$inbox}/{$camera->ftp_user}";

        if (! $disk->directoryExists($dir)) {
            return [];
        }

        return collect($disk->files($dir))
            ->reject(fn ($path) => str_contains($path, '/.done/') || str_contains($path, '/.quarantine/'))
            ->values()->all();
    }

    private function ingestFile(FilesystemAdapter $disk, string $inbox, Camera $camera, string $path): string
    {
        $hash = hash('sha256', $path.'|'.$disk->size($path));

        if (CameraSnapshot::where('source_hash', $hash)->exists()) {
            $this->moveTo($disk, $path, "{$inbox}/{$camera->ftp_user}/.done/".basename($path));

            return 'skipped';
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if (! isset(self::ALLOWED_MIMES[$extension]) || $disk->size($path) > self::MAX_BYTES) {
            $this->moveTo($disk, $path, "{$inbox}/{$camera->ftp_user}/.quarantine/".basename($path));
            Log::warning('CameraIngestService: quarantined file', ['path' => $path]);

            return 'quarantined';
        }

        // Copy first (source stays until success), then archive the original.
        $stored = "camera-snapshots/{$camera->id}/".basename($path);
        $disk->copy($path, $stored);

        $snapshot = CameraSnapshot::create([
            'camera_id' => $camera->id,
            'file_path' => $stored,
            'mime' => self::ALLOWED_MIMES[$extension],
            'size_bytes' => $disk->size($stored),
            'event_type' => $this->resolveEventType(),
            'captured_at' => now(),
            'source_hash' => $hash,
        ]);

        $this->moveTo($disk, $path, "{$inbox}/{$camera->ftp_user}/.done/".basename($path));
        $this->notifyStaff($snapshot->fresh('camera'));

        return 'processed';
    }

    private function moveTo(FilesystemAdapter $disk, string $from, string $to): void
    {
        $disk->makeDirectory(dirname($to));
        $disk->move($from, $to);
    }

    private function resolveEventType(): string
    {
        $recentPanic = PanicAlert::where('status', PanicAlert::STATUS_ACTIVE)
            ->where('created_at', '>=', now()->subMinutes(5))
            ->exists();

        return $recentPanic ? CameraSnapshot::EVENT_PANIC : CameraSnapshot::EVENT_MOTION;
    }

    private function notifyStaff(CameraSnapshot $snapshot): void
    {
        $staff = User::whereHas('roles', fn ($query) => $query->whereIn('name', ['admin', 'satpam']))
            ->where('is_active', true)
            ->get();

        foreach ($staff as $member) {
            try {
                $member->notify(new CameraSnapshotStored(
                    $snapshot->id,
                    $snapshot->camera->name,
                    $snapshot->event_type,
                ));
            } catch (\Throwable $exception) {
                Log::warning('CameraIngestService: failed to store snapshot notification', [
                    'snapshot_id' => $snapshot->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        // WA only for panic-correlated snapshots, dispatched after the row exists.
        if ($snapshot->event_type === CameraSnapshot::EVENT_PANIC) {
            SendCameraWhatsappJob::dispatch($snapshot->id);
        }
    }
}
```

```php
<?php

namespace App\Console\Commands;

use App\Services\CameraIngestService;
use Illuminate\Console\Command;

class CameraIngestCommand extends Command
{
    protected $signature = 'camera:ingest {--camera= : ID kamera tertentu (opsional)}';

    protected $description = 'Ingest file FTP CCTV dari inbox ke snapshot log';

    public function handle(CameraIngestService $ingest): int
    {
        $cameraId = $this->option('camera') !== null ? (int) $this->option('camera') : null;
        $summary = $ingest->ingest($cameraId);
        $this->info("processed={$summary['processed']} skipped={$summary['skipped']} quarantined={$summary['quarantined']}");

        return self::SUCCESS;
    }
}
```

`routes/console.php` — append (keep the existing inspire block):

```php
use Illuminate\Support\Facades\Schedule;

Schedule::command('camera:ingest')->everyMinute();
```

- [ ] **Step 6: Write resource + controller + routes**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CameraSnapshotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'camera_id' => $this->camera_id,
            'camera_name' => $this->camera?->name,
            'file_path' => $this->file_path,
            'file_url' => $this->file_path ? Storage::disk('public')->url($this->file_path) : null,
            'mime' => $this->mime,
            'size_bytes' => $this->size_bytes,
            'event_type' => $this->event_type,
            'captured_at' => $this->captured_at,
            'created_at' => $this->created_at,
        ];
    }
}
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CameraSnapshotResource;
use App\Models\CameraAccessLog;
use App\Models\CameraSnapshot;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CameraSnapshotController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $query = CameraSnapshot::query()->with('camera:id,name');

        if ($request->filled('camera_id')) {
            $query->where('camera_id', $request->camera_id);
        }

        if ($request->filled('event_type')) {
            $query->where('event_type', $request->event_type);
        }

        if ($request->filled('date')) {
            $query->whereDate('captured_at', $request->date);
        }

        $this->applySorting($query, $request, ['captured_at', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), CameraSnapshotResource::class);
    }

    public function show(Request $request, CameraSnapshot $cameraSnapshot)
    {
        $this->authorize('view', $cameraSnapshot);

        CameraAccessLog::create([
            'snapshot_id' => $cameraSnapshot->id,
            'user_id' => $request->user()->id,
            'viewed_at' => now(),
        ]);

        return new CameraSnapshotResource($cameraSnapshot->load('camera'));
    }

    public function destroy(CameraSnapshot $cameraSnapshot)
    {
        $this->authorize('delete', $cameraSnapshot);

        Storage::disk('public')->delete($cameraSnapshot->file_path);
        $cameraSnapshot->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
```

Routes (auth group, after the security block — find it):

```php
    // CCTV (Fase 6)
    Route::get('camera-snapshots', [CameraSnapshotController::class, 'index'])->middleware('can:snapshots.view');
    Route::get('camera-snapshots/{cameraSnapshot}', [CameraSnapshotController::class, 'show'])->middleware('can:snapshots.view');
    Route::delete('camera-snapshots/{cameraSnapshot}', [CameraSnapshotController::class, 'destroy']);
```

Add the import (alphabetical).

- [ ] **Step 7: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Api/CameraIngestTest.php`
Expected: PASS (6 tests). Watch: `Storage::fake('public')` + `config('cctv.inbox_path')` — service reads config at call time, test sets it per-test. `directoryExists`/`files` work on fake. `PanicAlert::STATUS_ACTIVE` constant exists (Fase 4). `User::is_active` column exists (UserSeeder sets it).

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_09_10_000008_create_cameras_table.php database/migrations/2026_09_10_000009_create_camera_snapshots_table.php database/migrations/2026_09_10_000010_create_camera_access_logs_table.php config/cctv.php app/Services/CameraIngestService.php app/Console/Commands/CameraIngestCommand.php app/Http/Controllers/Api/CameraSnapshotController.php app/Http/Resources/CameraSnapshotResource.php app/Notifications/CameraSnapshotStored.php app/Jobs/SendCameraWhatsappJob.php routes/console.php routes/api.php .env.example tests/Feature/Api/CameraIngestTest.php
git commit -m "feat: add CCTV ingest with panic-correlated notifications"
```

---

### Task 3: cameras admin backend (CRUD + simulator)

**Files:**
- Create: `app/Console/Commands/CameraSimulateCommand.php`
- Create: `app/Http/Controllers/Api/CameraController.php`
- Create: `app/Http/Resources/CameraResource.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/CameraTest.php`

**Interfaces:**
- Consumes: `CameraPolicy` (Task 1), `CameraIngestService::ingest` (Task 2).
- Produces: routes `GET/POST /api/cameras`, `GET/PUT/DELETE /api/cameras/{camera}`, `POST /api/cameras/{camera}/simulate`.

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Camera;
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
    }

    public function test_simulate_blocked_in_production()
    {
        $camera = Camera::factory()->create(['camera_type' => 'simulator']);
        app()->detectEnvironment(fn () => 'production');

        $this->actingAs($this->admin)->postJson("/api/cameras/{$camera->id}/simulate")
            ->assertStatus(403);
    }
}
```

Note: `detectEnvironment` in the last test leaks to later tests in the file? PHPUnit RefreshDatabase doesn't reset env. Order risk: put the production test LAST (it is), and note that `APP_ENV` stays production for subsequent FILES? No — each test process... same process for whole suite run! `detectEnvironment` mutates the app instance; RefreshDatabase recreates app per test? `RefreshDatabase` refreshes DB per test but the application is rebooted per test in Laravel (each test gets fresh app). Yes — Laravel creates a fresh application per test method, so env mutation doesn't leak. Safe.

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Api/CameraTest.php`
Expected: FAIL — routes don't exist (404s).

- [ ] **Step 3: Write controller + resource + command + routes**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CameraResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'location' => $this->location,
            'ftp_user' => $this->ftp_user,
            'camera_type' => $this->camera_type,
            'stream_url' => $this->stream_url,
            'is_active' => $this->is_active,
            'snapshots_count' => $this->whenCounted('snapshots'),
            'created_at' => $this->created_at,
        ];
    }
}
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CameraResource;
use App\Http\Resources\CameraSnapshotResource;
use App\Models\Camera;
use App\Services\CameraIngestService;
use App\Services\HtmlSanitizer;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class CameraController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private HtmlSanitizer $htmlSanitizer,
        private CameraIngestService $ingest,
    ) {}

    public function index(Request $request)
    {
        $query = Camera::query()->withCount('snapshots');

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['name', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), CameraResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
            'ftp_user' => ['required', 'string', 'max:64', 'unique:cameras,ftp_user'],
            'camera_type' => ['required', Rule::in([Camera::TYPE_TAPO, Camera::TYPE_SIMULATOR])],
            'stream_url' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        foreach (['name', 'location'] as $field) {
            if (isset($validated[$field]) && $validated[$field] !== null) {
                $validated[$field] = $this->htmlSanitizer->sanitize($validated[$field]);
            }
        }

        return (new CameraResource(Camera::create($validated)))->response()->setStatusCode(201);
    }

    public function show(Camera $camera)
    {
        return new CameraResource($camera->loadCount('snapshots'));
    }

    public function update(Request $request, Camera $camera)
    {
        $this->authorize('update', $camera);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'ftp_user' => ['sometimes', 'string', 'max:64', Rule::unique('cameras', 'ftp_user')->ignore($camera->id)],
            'camera_type' => ['sometimes', Rule::in([Camera::TYPE_TAPO, Camera::TYPE_SIMULATOR])],
            'stream_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        foreach (['name', 'location'] as $field) {
            if (array_key_exists($field, $validated) && $validated[$field] !== null) {
                $validated[$field] = $this->htmlSanitizer->sanitize($validated[$field]);
            }
        }

        $camera->update($validated);

        return new CameraResource($camera->fresh()->loadCount('snapshots'));
    }

    public function destroy(Camera $camera)
    {
        $this->authorize('delete', $camera);
        $camera->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function simulate(Request $request, Camera $camera)
    {
        abort_unless(app()->environment('local', 'testing'), 403, 'Simulasi hanya di non-production.');
        $this->authorize('update', $camera);

        $count = min((int) $request->input('count', 1), 5);
        $disk = Storage::disk('public');
        $inbox = trim((string) config('cctv.inbox_path', 'ftp-inbox'), '/');
        $dir = "{$inbox}/{$camera->ftp_user}";
        $disk->makeDirectory($dir);

        for ($i = 0; $i < $count; $i++) {
            $disk->put("{$dir}/sim-".now()->format('YmdHis')."-{$i}-".uniqid().'.jpg', 'simulated-bytes');
        }

        $this->ingest->ingest($camera->id);

        $snapshots = $camera->snapshots()->latest('id')->take($count)->with('camera')->get();

        return (CameraSnapshotResource::collection($snapshots))->response()->setStatusCode(201);
    }
}
```

Wait — simulated files get `event_type` motion (no panic) unless panic active. Spec says simulated badge. Hmm: spec §6 says event `simulated`. But ingest resolves motion/panic only. Fix: `camera:simulate` path should mark simulated. Options: ingest service accepts `$forceEvent` param: `ingest(?int $cameraId = null, ?string $forceEvent = null)`; simulate endpoint calls `ingest($camera->id, CameraSnapshot::EVENT_SIMULATED)`. Update Task 2's service signature accordingly — Task 3 brief can't change Task 2's committed code... it CAN (owning plan's files, TDD). Simpler: implementer of THIS task edits the service to add the optional param (default null = resolve normally) + test. Add explicit instruction: modify `ingest()` + `ingestFile()` to thread `?string $forceEvent`, and add a test asserting simulate-created snapshots have `event_type === 'simulated'`. Also update the Task 2 test? No — Task 2 tests still pass (default null).

Also `CameraSimulateCommand`:

```php
<?php

namespace App\Console\Commands;

use App\Models\Camera;
use App\Services\CameraIngestService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CameraSimulateCommand extends Command
{
    protected $signature = 'camera:simulate {camera : ID kamera} {--count=1 : jumlah file}';

    protected $description = 'Tulis file dummy ke inbox kamera lalu ingest (dev only)';

    public function handle(CameraIngestService $ingest): int
    {
        abort_unless(app()->environment('local', 'testing'), 403, 'Simulasi hanya di non-production.');

        $camera = Camera::findOrFail($this->argument('camera'));
        $count = min((int) $this->option('count'), 5);
        $disk = Storage::disk('public');
        $inbox = trim((string) config('cctv.inbox_path', 'ftp-inbox'), '/');
        $dir = "{$inbox}/{$camera->ftp_user}";
        $disk->makeDirectory($dir);

        for ($i = 0; $i < $count; $i++) {
            $disk->put("{$dir}/sim-".now()->format('YmdHis')."-{$i}-".uniqid().'.jpg', 'simulated-bytes');
        }

        $summary = $ingest->ingest($camera->id, \App\Models\CameraSnapshot::EVENT_SIMULATED);
        $this->info("processed={$summary['processed']}");

        return self::SUCCESS;
    }
}
```

Hmm — duplication between endpoint and command. Better: put `writeSimulatedFiles(Camera $camera, int $count): void` on the ingest service, both callers use it. Instruct that: add public `writeSimulatedFiles` to service, endpoint + command call it then `ingest($camera->id, EVENT_SIMULATED)`. And endpoint `simulate` also aborts non-prod (already) + authorize update (admin-only effectively since update = manage... satpam can't simulate — fine, dev-only admin tool).

Routes (add to the CCTV block):

```php
    Route::get('cameras', [CameraController::class, 'index'])->middleware('can:cameras.view');
    Route::post('cameras', [CameraController::class, 'store'])->middleware('can:cameras.manage');
    Route::get('cameras/{camera}', [CameraController::class, 'show'])->middleware('can:cameras.view');
    Route::put('cameras/{camera}', [CameraController::class, 'update']);
    Route::delete('cameras/{camera}', [CameraController::class, 'destroy']);
    Route::post('cameras/{camera}/simulate', [CameraController::class, 'simulate']);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Api/CameraTest.php tests/Feature/Api/CameraIngestTest.php`
Expected: PASS (4 + 6 tests).

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Console/Commands/CameraSimulateCommand.php app/Http/Controllers/Api/CameraController.php app/Http/Resources/CameraResource.php app/Services/CameraIngestService.php routes/api.php tests/Feature/Api/CameraTest.php
git commit -m "feat: add camera admin CRUD and simulator"
```

---

### Task 4: CCTV frontend (gallery + admin)

**Files:**
- Modify: `src/types/api.ts` (append types)
- Create: `src/services/cctv.ts`
- Create: `src/hooks/use-cctv.ts`
- Create: `src/features/siwarga-cctv/cctv-page.tsx`
- Create: `src/routes/_authenticated/cctv/index.tsx`
- Modify: `src/components/layout/data/sidebar-data.ts` (CCTV entry, `snapshots.view`, Keamanan group)

**Interfaces:**
- Consumes: Task 2–3 endpoints + resource keys (verify exact keys from committed backend first — `file_url`, `snapshots_count`, etc.).
- Produces: page at `/cctv`; hooks `useCameras`, `useCreateCamera`, `useUpdateCamera`, `useDeleteCamera`, `useSnapshots`, `useSimulateCamera`.

- [ ] **Step 1: Append TS types**

```ts
export type CameraType = 'tapo' | 'simulator'
export type SnapshotEvent = 'motion' | 'panic' | 'manual' | 'simulated'

export interface Camera {
  id: number
  name: string
  location: string | null
  ftp_user: string
  camera_type: CameraType
  stream_url: string | null
  is_active: boolean
  snapshots_count?: number
  created_at: string
}

export interface CameraSnapshot {
  id: number
  camera_id: number
  camera_name: string | null
  file_path: string
  file_url: string | null
  mime: string
  size_bytes: number
  event_type: SnapshotEvent
  captured_at: string | null
  created_at: string
}

export interface SnapshotFilter {
  page?: number
  per_page?: number
  camera_id?: number
  event_type?: SnapshotEvent
  date?: string
}
```

- [ ] **Step 2: Write service + hooks**

`src/services/cctv.ts`:

```ts
import type {
  ApiResponse,
  Camera,
  CameraSnapshot,
  PaginatedResponse,
  SnapshotFilter,
} from '@/types/api'
import api from './api'

export interface CameraInput {
  name: string
  location?: string
  ftp_user: string
  camera_type: 'tapo' | 'simulator'
  stream_url?: string
  is_active?: boolean
}

export const cctvService = {
  cameras: (params?: { page?: number; search?: string }) =>
    api.get<PaginatedResponse<Camera>>('/api/cameras', { params }),
  createCamera: (input: CameraInput) =>
    api.post<ApiResponse<Camera>>('/api/cameras', input),
  updateCamera: (id: number, input: Partial<CameraInput>) =>
    api.put<ApiResponse<Camera>>(`/api/cameras/${id}`, input),
  deleteCamera: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/cameras/${id}`),
  snapshots: (params?: SnapshotFilter) =>
    api.get<PaginatedResponse<CameraSnapshot>>('/api/camera-snapshots', { params }),
  deleteSnapshot: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/camera-snapshots/${id}`),
  simulate: (id: number, count = 1) =>
    api.post<ApiResponse<CameraSnapshot[]>>(`/api/cameras/${id}/simulate`, { count }),
}
```

`src/hooks/use-cctv.ts`: `useCameras`, `useCreateCamera`, `useUpdateCamera`, `useDeleteCamera`, `useSnapshots`, `useDeleteSnapshot`, `useSimulateCamera` — mirror `use-guest-logs.ts` (query + mutations, Bahasa toasts: 'Kamera disimpan', 'Kamera dihapus', 'Snapshot dihapus', 'Simulasi berhasil', errors 'Gagal ...').

- [ ] **Step 3: Write the page**

`src/features/siwarga-cctv/cctv-page.tsx` — two tabs (use simple state tabs, no new dep): (1) "Galeri" — snapshot grid (thumbnail `<img src={file_url}>`, camera name, event badge map motion→'Gerakan'/panic→'Panic'/manual→'Manual'/simulated→'Simulasi', date) + filters camera/event/date via `use-table-url-state`, delete button gated `cameras.manage`, click → detail dialog with full image + access info; (2) "Kamera" — table + CRUD dialog (name/location/ftp_user/camera_type/stream_url/is_active) gated `cameras.manage`, "Simulasi" button per row (dev only: render only when `import.meta.env.DEV`, calls simulate). Accessible names (Task 6 contract): `Tambah Kamera`, `Simpan Kamera`, `Simulasi`, `Hapus`.

- [ ] **Step 4: Route + sidebar**

`src/routes/_authenticated/cctv/index.tsx` (zod: page, camera_id, event_type, date — mirror guest-logs route). Sidebar Keamanan group: `CCTV` (`/cctv`, `snapshots.view`).

- [ ] **Step 5: Verify with build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 6: Format and commit**

```bash
npm run format
git add src/types/api.ts src/services/cctv.ts src/hooks/use-cctv.ts src/features/siwarga-cctv/cctv-page.tsx src/routes/_authenticated/cctv/index.tsx src/components/layout/data/sidebar-data.ts src/routeTree.gen.ts
git commit -m "feat: add CCTV gallery and camera admin UI"
```

---

### Task 5: docker/ftp config (ftp service, inbox mount, scheduler)

**Files:**
- Modify: `docker-compose.yml` (repo root)
- Modify: `docker-compose.prd.yml` (repo root)
- Modify: `.env.example` (repo root)

**Interfaces:**
- Consumes: `camera:ingest` + `config('cctv.inbox_path')` default `ftp-inbox` (Task 2), per-camera `ftp_user` (Task 3).
- Produces: running `ftp` + `scheduler` services; inbox visible read-only inside app containers at the public-disk path.

Design §Deploy names `FTP_INBOX_PATH=/mnt/ftp-inbox` as an absolute mount. This task deliberately mounts the volume INSIDE the public disk (`storage/app/public/ftp-inbox`, relative `FTP_INBOX_PATH=ftp-inbox`) so the Task 2 service code, `Storage::fake` tests, and docker share one code path — no absolute-path branch. Camera login isolation stays per design: one FTP account per camera, jailed to its own home dir, created via `pure-pw` (image `stilliard/pure-ftpd` per design).

- [ ] **Step 1: Confirm the scheduler command exists**

Run: `php artisan list --raw | grep schedule`
Expected: `schedule:work` listed (fires `Schedule::command('camera:ingest')->everyMinute()` from Task 2). If missing, BLOCKED — report instead of inventing cron.

- [ ] **Step 2: Wire dev compose (`docker-compose.yml`)**

Add volume `siwarga_ftp_data` to `volumes:`. Add service (ports: `21` + passive range; firewall note stays as a comment):

```yaml
  ftp:
    image: stilliard/pure-ftpd:hardened
    restart: unless-stopped
    # Firewall host: buka 21 + FTP_PASV_RANGE. FTPS bila didukung kamera.
    ports:
      - '${FTP_PORT:-21}:21'
      - '${FTP_PASV_RANGE:-30000-30009}:30000-30009'
    environment:
      PUBLICHOST: ${FTP_PUBLICHOST:-localhost}
      FTP_USER_NAME: ${FTP_USER:-cctv-gerbang}
      FTP_USER_PASS: ${FTP_PASS:-change-me}
      FTP_USER_HOME: /home/ftpusers/cctv-gerbang
    volumes:
      - siwarga_ftp_data:/home/ftpusers/
```

Per-camera accounts (after first boot, exact commands — `pure-pw` is standard pure-ftpd tooling):

```bash
docker compose exec ftp pure-pw useradd tapo-pos -u ftpuser -d /home/ftpusers/tapo-pos
docker compose exec ftp pure-pw mkdb
docker compose exec ftp pure-pw list
```

Backend + new scheduler service gain the read-only inbox mount and env (mirror the existing backend `environment:` block, add one line):

```yaml
    environment:
      # ... existing backend env ...
      FTP_INBOX_PATH: ${FTP_INBOX_PATH:-ftp-inbox}
    volumes:
      # ... existing volumes ...
      - siwarga_ftp_data:/var/www/html/storage/app/public/ftp-inbox:ro
```

```yaml
  scheduler:
    build:
      context: ./src/backend
      dockerfile: Dockerfile
    image: siwarga-backend:dev
    restart: unless-stopped
    command: ['php', 'artisan', 'schedule:work']
    environment:
      APP_NAME: ${APP_NAME:-SIWarga}
      APP_ENV: ${APP_ENV:-local}
      APP_KEY: ${APP_KEY:-}
      APP_DEBUG: ${APP_DEBUG:-true}
      APP_URL: ${APP_URL:-http://localhost:8000}
      DB_CONNECTION: mysql
      DB_HOST: db
      DB_PORT: 3306
      DB_DATABASE: ${DB_DATABASE:-siwarga}
      DB_USERNAME: ${DB_USERNAME:-siwarga}
      DB_PASSWORD: ${DB_PASSWORD:-secret}
      SESSION_DRIVER: database
      CACHE_STORE: database
      QUEUE_CONNECTION: database
      FILESYSTEM_DISK: local
      LOG_CHANNEL: stack
      FTP_INBOX_PATH: ${FTP_INBOX_PATH:-ftp-inbox}
    volumes:
      - ./src/backend:/var/www/html
      - siwarga_backend_vendor:/var/www/html/vendor
      - siwarga_ftp_data:/var/www/html/storage/app/public/ftp-inbox:ro
    depends_on:
      db:
        condition: service_healthy
```

- [ ] **Step 3: Mirror in prod compose (`docker-compose.prd.yml`)**

Same `ftp` service (image + ports + env + `siwarga_ftp_data_prd` volume), same `:ro` mount into `backend` at `/var/www/html/storage/app/public/ftp-inbox` (mounts over a subpath of the existing `siwarga_backend_storage_prd` volume — more specific mount wins), same `scheduler` service built from `Dockerfile.prd` with `APP_ENV: production` and `APP_KEY: ${APP_KEY:?...}` / DB vars copied from the prod backend block. Add `siwarga_ftp_data_prd:` under `volumes:`.

- [ ] **Step 4: Root `.env.example` additions**

```bash
# --- CCTV FTP ingest (Fase 6) ---
FTP_PORT=21
FTP_PASV_RANGE=30000-30009
FTP_PUBLICHOST=localhost
FTP_USER=cctv-gerbang
FTP_PASS=change-me
FTP_INBOX_PATH=ftp-inbox
```

- [ ] **Step 5: Verify compose files parse + command exists**

Run: `docker compose config > /dev/null && docker compose -f docker-compose.prd.yml config > /dev/null && php artisan camera:ingest --help`
Expected: both configs validate; help prints `ID kamera tertentu (opsional)`. If no docker daemon is available, the `config` subcommand still validates without a daemon — run at least that; live `up` + `pure-pw list` smoke test is documented for the operator, not asserted here.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml docker-compose.prd.yml .env.example
git commit -m "chore: add CCTV FTP service, inbox mount, and scheduler"
```

---

### Task 6: e2e coverage + full verification

**Files:**
- Create: `src/frontend/e2e/siwarga/fase-6-cctv.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–5. Helpers: `test, expect, apiToken, apiPost, apiGet, uid, defaultAdmin, apiBaseURL`.
- Produces: 3 green e2e flows; full-suite verification evidence.

Accessible names (exact, from Task 4): `Tambah Kamera`, `Simpan Kamera`, `Simulasi`, `Hapus`. Adapt selectors to UI within allowance, never rename UI.

- [ ] **Step 1: Write the spec**

```ts
import { test, expect, apiToken, apiPost, apiGet, uid, defaultAdmin, apiBaseURL } from './setup'

test.describe('Fase 6 CCTV', () => {
  test('simulate produces snapshots visible in gallery + bell', async ({ page }) => {
    const adminToken = await apiToken(defaultAdmin.email, defaultAdmin.password)
    // create simulator camera via apiPost('/api/cameras', {name: uid, ftp_user: uid, camera_type: 'simulator'})
    // POST simulate via apiPost → 201
    // login as admin, goto /cctv → expect snapshot thumbnail/badge visible
    // goto /notifications → expect 'Snapshot CCTV' entry
  })

  test('warga gets 403 on snapshots API', async ({ request }) => {
    // per-test warga user (panic-test pattern); login token via apiToken
    // GET /api/camera-snapshots → 403; GET /api/cameras → 403
  })

  test('public household verify still works (no regression)', async ({ request }) => {
    // GET /api/public/households/999.invalid → 404 (contract untouched by this plan)
  })
})
```

Expand following `fase-5-convenience.spec.ts` (per-test users where login needed, uid names, no sleeps, API-state asserts, never WA delivery). Bell assertion: `/notifications` API contains title `Snapshot CCTV` (check NotificationController index shape first — Fase 2 pattern).

- [ ] **Step 2: Start servers, run the new spec**

Backend `:8000` + dev `:5173`. `npx playwright install chromium` if needed else BLOCKED.

Run: `npx playwright test e2e/siwarga/fase-6-cctv.spec.ts`
Expected: 3/3 PASS.

- [ ] **Step 3: Full verification**

`composer test`, `npm run build`, `npm run test`, full `npx playwright test` (current dev DB state, document choice). Triage pre-existing with file evidence; fix only this-plan breakage in owning files under TDD.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/e2e/siwarga/fase-6-cctv.spec.ts
git commit -m "test: add Fase 6 CCTV e2e (simulate, RBAC, no-regression)"
```

---

## Self-Review

**1. Spec coverage:** §2 tables → Tasks 1–2 ✓; §3 ingest flow → Task 2 ✓ (copy-then-archive, quarantine, scheduler, env, panic correlation, delete-cleanup); §3 deploy (ftp service, per-camera `pure-pw` accounts, `:ro` mount, per-minute scheduler, firewall ports) → Task 5 ✓; §4 RBAC → Tasks 1–2 ✓ (warga 403, access logs, panic exception out-of-scope stated); §5 endpoints → Tasks 2–3 ✓ (all rows incl. simulate dev-only); §5 frontend → Task 4 ✓ (all elements incl. dev-only simulate button, no HLS player); §6 simulator → Task 3 ✓ (endpoint + artisan command, `simulated` badge); §6 tests → Tasks 1–3, 6 ✓.

**2. Placeholder scan:** no TBD/TODO/"similar to". Delegations concrete (verify exact keys/names/shapes first, named files).

**3. Type consistency:** `Camera`/`CameraSnapshot` TS keys match specified `toArray` keys (`file_url`, `snapshots_count`); hook/service/route names consistent Tasks 4, 6; `CameraIngestService::ingest(?int, ?string)` signature identical in Tasks 2–3 (Task 3 extends with defaulted param — backward compatible); policy method names match controller `authorize()` calls; `{cameraSnapshot}` binding ↔ `CameraSnapshot $cameraSnapshot` consistent; `FTP_INBOX_PATH` default `ftp-inbox` identical in Task 2 `config/cctv.php`, Task 5 compose env, and root `.env.example`; compose volume names `siwarga_ftp_data` (dev) / `siwarga_ftp_data_prd` (prod) match their files' `volumes:` blocks.
