# Fase 2 Ticketing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build warga complaint ticketing (report + photo + forward-only status + PIC assign + comments) with dual notifications (WA otomatis + generic in-app infra) plus an anonymous suggestion box — backend API + React UI + tests.

**Architecture:** Three vertical slices (ticketing core → notification wiring → suggestions), each Controller → Policy → Service on the backend and a `siwarga-*` feature module with thin axios service + TanStack Query hooks on the frontend. granular permissions (`tickets.view-all/manage-status/assign`) instead of hardcoded roles so future roles can be granted subsets; all user-rendered HTML sanitized server-side via existing `HtmlSanitizer`.

**Tech Stack:** Laravel 13, PHPUnit, MySQL, React 19 + TanStack Query/Router, existing `WahaService` + queue (`tries = 3` pattern), Laravel database notifications, existing `storage:link` public disk.

**Spec:** `docs/superpowers/specs/2026-09-09-fase-2-ticketing-design.md` (all 5 sections approved by user).

## Global Constraints

- Follow Pint formatting (`vendor/bin/pint --dirty --format agent`) before each PHP commit.
- Every change must be programmatically tested (TDD: failing test first, then minimal implementation).
- Status transitions are forward-only (open → in_progress → resolved); any jump/backwards is 422.
- Attachments: max 3 files @ 2MB each (jpg/png), public disk under `ticket-attachments/`, pola `ktp-photos`.
- Notifications must never fail the triggering action (try/catch + log, pola read-receipt Fase 1); WA sends are queued, never synchronous.
- Suggestions store no identity by design (no user_id column); throttle ringan seperti endpoint kontak.
- Frontend toasts in Bahasa Indonesia; reuse `DataTable*` primitives, `use-table-url-state`, `Header`/`Main` layout, `useHasPermission`, and the contact-messages page pattern.
- No MSW handler exists yet for tickets/suggestions/notifications — none to update.

---

## File map

| File | Responsibility |
|---|---|
| `app/Models/Permission.php` | +7 system permissions |
| `app/Policies/TicketPolicy.php` (new) | ticket authorization incl. view-all vs own |
| `app/Policies/SuggestionPolicy.php` (new) | suggestion authorization |
| `database/migrations/2026_09_09_*` (new ×5) | tickets, ticket_comments, ticket_attachments, notifications, anonymous_suggestions |
| `app/Models/Ticket.php`, `TicketComment.php`, `TicketAttachment.php`, `AnonymousSuggestion.php` (new) | Eloquent models + relations |
| `app/Services/TicketService.php` (new) | create/status/assign/comment/attachment logic |
| `app/Http/Controllers/Api/TicketController.php` (new) | ticket endpoints |
| `app/Http/Controllers/Api/NotificationController.php` (new) | own-notifications endpoints |
| `app/Http/Controllers/Api/SuggestionController.php` (new) | suggestion endpoints |
| `app/Notifications/TicketStatusUpdated.php` (new) | database-channel payload |
| `app/Jobs/SendTicketWhatsappJob.php` (new) | queued WA to reporter |
| `app/Http/Resources/TicketResource.php`, `TicketCommentResource.php`, `TicketAttachmentResource.php`, `SuggestionResource.php` (new) | JSON shapes |
| `routes/api.php`, `app/Providers/AppServiceProvider.php`, `database/seeders/RoleSeeder.php` | routes, gates, throttle, seed deltas |
| `src/types/api.ts` | TS types for 3 domains |
| `src/services/tickets.ts`, `notifications.ts`, `suggestions.ts` (new) | thin axios clients |
| `src/hooks/use-tickets.ts`, `use-notifications.ts`, `use-suggestions.ts` (new) | TanStack Query hooks |
| `src/features/siwarga-tickets/*`, `siwarga-notifications/*`, `siwarga-suggestions/*` (new) | pages incl. bell |
| `src/routes/_authenticated/tickets/index.tsx`, `notifications/index.tsx`, `suggestions/index.tsx` (new) | routes + zod schemas |
| `src/components/layout/data/sidebar-data.ts` | new `Layanan` nav group |

---

### Task 1: ticketing/suggestion permissions, policies, gates, RoleSeeder

**Files:**
- Modify: `app/Models/Permission.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Modify: `database/seeders/RoleSeeder.php`
- Create: `app/Policies/TicketPolicy.php`
- Create: `app/Policies/SuggestionPolicy.php`
- Test: `tests/Unit/TicketPolicyTest.php`
- Test: `tests/Unit/SuggestionPolicyTest.php`

**Interfaces:**
- Consumes: `User::hasPermission()`, `Permission::SYSTEM_PERMISSIONS`, `PermissionSeeder` + `RoleSeeder` (admin auto-syncs `Permission::all()`).
- Produces: `TicketPolicy::{viewAny,view,create,updateStatus,assign,comment,attach}`, `SuggestionPolicy::{viewAny,view,create,markReviewed}` — consumed via auto-discovery by Tasks 2–4 controllers.
- Produces: gates `tickets.view`, `tickets.create`, `tickets.view-all`, `tickets.manage-status`, `tickets.assign`, `suggestions.view`, `suggestions.create` — status/assign enforced via `can:` route middleware (permission-only, no instance needed); view/comment/attach via `$this->authorize()` per-instance.

- [ ] **Step 1: Write the failing policy tests**

```php
<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\Ticket;
use App\Models\User;
use App\Policies\TicketPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketPolicyTest extends TestCase
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

    public function test_admin_can_do_everything()
    {
        $admin = $this->actingUser('admin');
        $policy = new TicketPolicy;
        $ticket = Ticket::factory()->make(['reported_by' => 999]);

        $this->assertTrue($policy->viewAny($admin));
        $this->assertTrue($policy->view($admin, $ticket));
        $this->assertTrue($policy->create($admin));
        $this->assertTrue($policy->updateStatus($admin));
        $this->assertTrue($policy->assign($admin));
    }

    public function test_warga_can_view_own_but_not_others_and_cannot_manage()
    {
        $warga = $this->actingUser('warga');
        $policy = new TicketPolicy;

        $this->assertTrue($policy->view($warga, Ticket::factory()->make(['reported_by' => $warga->id])));
        $this->assertFalse($policy->view($warga, Ticket::factory()->make(['reported_by' => 999])));
        $this->assertTrue($policy->create($warga));
        $this->assertFalse($policy->updateStatus($warga));
        $this->assertFalse($policy->assign($warga));
    }

    public function test_status_and_assign_permissions_are_separately_grantable()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $role = Role::create(['name' => 'petugas', 'description' => 'Petugas lapangan']);
        $role->permissions()->attach(
            \App\Models\Permission::whereIn('name', ['tickets.view-all', 'tickets.manage-status'])->pluck('id')
        );
        $user = User::factory()->create();
        $user->roles()->attach($role->id);
        $user->load('roles.permissions');

        $this->assertTrue((new TicketPolicy)->updateStatus($user));
        $this->assertFalse((new TicketPolicy)->assign($user));
    }
}
```

```php
<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\User;
use App\Policies\SuggestionPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuggestionPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_but_warga_can_only_create()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $admin->load('roles.permissions');
        $warga = User::factory()->create();
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');

        $this->assertTrue((new SuggestionPolicy)->viewAny($admin));
        $this->assertTrue((new SuggestionPolicy)->markReviewed($admin));
        $this->assertFalse((new SuggestionPolicy)->viewAny($warga));
        $this->assertTrue((new SuggestionPolicy)->create($warga));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Unit/TicketPolicyTest.php tests/Unit/SuggestionPolicyTest.php`
Expected: FAIL — classes `App\Policies\TicketPolicy` / `App\Models\Ticket` not found. (Ticket model arrives in Task 2; the policy + model stub must exist before these tests can pass. If you prefer, create the `Ticket` model with fillables/relations in this task as part of Step 4 — it is required for the policy type-hints.)

- [ ] **Step 3: Add the permissions**

In `app/Models/Permission.php`, add after the `'forum.manage'` line:

```php
        'forum.manage' => 'Moderasi forum diskusi',
        'tickets.view' => 'Lihat tiket pengaduan',
        'tickets.view-all' => 'Lihat semua tiket pengaduan',
        'tickets.create' => 'Buat tiket pengaduan',
        'tickets.manage-status' => 'Ubah status tiket pengaduan',
        'tickets.assign' => 'Assign PIC tiket pengaduan',
        'suggestions.create' => 'Kirim saran anonim',
        'suggestions.view' => 'Lihat kotak saran anonim',
```

- [ ] **Step 4: Write the `Ticket` model (needed by the policy type-hints) and the two policies**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ticket extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['reported_by', 'house_id', 'title', 'description', 'category', 'status', 'assigned_to'];

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function house(): BelongsTo
    {
        return $this->belongsTo(House::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TicketComment::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class);
    }
}
```

```php
<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

class TicketPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('tickets.view');
    }

    public function view(User $user, Ticket $ticket): bool
    {
        if ($user->hasPermission('tickets.view-all')) {
            return true;
        }

        return $user->hasPermission('tickets.view') && $ticket->reported_by === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('tickets.create');
    }

    public function updateStatus(User $user): bool
    {
        return $user->hasPermission('tickets.manage-status');
    }

    public function assign(User $user): bool
    {
        return $user->hasPermission('tickets.assign');
    }

    public function comment(User $user, Ticket $ticket): bool
    {
        return $this->view($user, $ticket);
    }

    public function attach(User $user, Ticket $ticket): bool
    {
        return $this->view($user, $ticket);
    }
}
```

```php
<?php

namespace App\Policies;

use App\Models\User;

class SuggestionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('suggestions.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('suggestions.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('suggestions.create');
    }

    public function markReviewed(User $user): bool
    {
        return $user->hasPermission('suggestions.view');
    }
}
```

- [ ] **Step 5: Register the gates**

In `app/Providers/AppServiceProvider.php`, add imports for `TicketPolicy` and `SuggestionPolicy`, then register in `registerGates()` after the forum line:

```php
        // Tickets & suggestions
        Gate::define('tickets.view', [TicketPolicy::class, 'viewAny']);
        Gate::define('tickets.view-all', fn (User $user) => $user->hasPermission('tickets.view-all'));
        Gate::define('tickets.create', [TicketPolicy::class, 'create']);
        Gate::define('tickets.manage-status', [TicketPolicy::class, 'updateStatus']);
        Gate::define('tickets.assign', [TicketPolicy::class, 'assign']);
        Gate::define('suggestions.view', [SuggestionPolicy::class, 'viewAny']);
        Gate::define('suggestions.create', [SuggestionPolicy::class, 'create']);
```

- [ ] **Step 6: Update `RoleSeeder`**

Warga list gains `'tickets.view', 'tickets.create', 'suggestions.create',`. Admin auto-syncs all. Bendahara unchanged (no ticketing remit per PRD role table):

```php
        // Warga can only view bills/payments within their own resident scope.
        $warga->permissions()->sync(Permission::whereIn('name', [
            'bills.view', 'bills.view.own', 'payments.view', 'payments.view.own',
            'announcements.view',
            'polls.view', 'polls.vote', 'forum.view',
            'tickets.view', 'tickets.create', 'suggestions.create',
        ])->pluck('id'));
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `php artisan test --compact tests/Unit/TicketPolicyTest.php tests/Unit/SuggestionPolicyTest.php`
Expected: PASS (4 tests). Note: `Ticket::factory()->make()` requires a `TicketFactory` — create `database/factories/TicketFactory.php` in this task (definition: reported_by → User::factory(), house_id → null, title → sentence, description → paragraph, category → null, status → 'open', assigned_to → null) since the policy tests need unsaved instances.

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Models/Permission.php app/Providers/AppServiceProvider.php database/seeders/RoleSeeder.php app/Models/Ticket.php app/Policies/TicketPolicy.php app/Policies/SuggestionPolicy.php database/factories/TicketFactory.php tests/Unit/TicketPolicyTest.php tests/Unit/SuggestionPolicyTest.php
git commit -m "feat: add tickets/suggestions permissions, policies, and gates"
```

---

### Task 2: Ticketing backend (migrations, models, service, controller, routes)

**Files:**
- Create: `database/migrations/2026_09_09_000001_create_tickets_table.php`
- Create: `database/migrations/2026_09_09_000002_create_ticket_comments_table.php`
- Create: `database/migrations/2026_09_09_000003_create_ticket_attachments_table.php`
- Create: `app/Models/TicketComment.php`
- Create: `app/Models/TicketAttachment.php`
- Create: `app/Services/TicketService.php`
- Create: `app/Http/Controllers/Api/TicketController.php`
- Create: `app/Http/Resources/TicketResource.php`
- Create: `app/Http/Resources/TicketCommentResource.php`
- Create: `app/Http/Resources/TicketAttachmentResource.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/TicketTest.php`

**Interfaces:**
- Consumes: `TicketPolicy` (Task 1), `HtmlSanitizer::sanitize(string): string`, `HouseResident` (active-house lookup), `UploadedFile::store('ticket-attachments', 'public')` (pola `ktp-photos`), base `Controller::paginated()`/`applySorting()`.
- Produces: `TicketService::{create(array, User): Ticket, changeStatus(Ticket, string, User): Ticket, assign(Ticket, int, User): Ticket, addComment(Ticket, string, User): TicketComment, addAttachment(Ticket, UploadedFile, User): TicketAttachment}` with `STATUS_ORDER = ['open' => 0, 'in_progress' => 1, 'resolved' => 2]`; routes `GET/POST /api/tickets`, `GET /api/tickets/{ticket}`, `POST /api/tickets/{ticket}/status`, `POST /api/tickets/{ticket}/assign`, `GET+POST /api/tickets/{ticket}/comments`, `POST /api/tickets/{ticket}/attachments`. Notification wiring into `changeStatus` arrives in Task 3 — this task asserts status mechanics only.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\House;
use App\Models\Resident;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TicketTest extends TestCase
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

        $resident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);

        $this->warga = User::factory()->create(['resident_id' => $resident->id]);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    public function test_warga_can_report_ticket_with_auto_house()
    {
        $response = $this->actingAs($this->warga)->postJson('/api/tickets', [
            'title' => 'Lampu Jalan Mati',
            'description' => '<p>Gang 3 gelap.</p>',
            'category' => 'kerusakan fasilitas',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.title', 'Lampu Jalan Mati');
        $this->assertDatabaseHas('tickets', ['title' => 'Lampu Jalan Mati', 'reported_by' => $this->warga->id]);
        $this->assertNotNull($response->json('data.house_id'));
    }

    public function test_warga_cannot_view_others_ticket_but_admin_can_list_all()
    {
        $mine = Ticket::factory()->create(['reported_by' => $this->warga->id]);
        $theirs = Ticket::factory()->create();

        $this->actingAs($this->warga)->getJson("/api/tickets/{$theirs->id}")->assertStatus(403);
        $this->actingAs($this->warga)->getJson("/api/tickets/{$mine->id}")->assertStatus(200);

        $this->actingAs($this->admin)->getJson('/api/tickets')->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_status_moves_forward_only()
    {
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id, 'status' => 'open']);

        $this->actingAs($this->admin)->postJson("/api/tickets/{$ticket->id}/status", ['status' => 'in_progress'])
            ->assertStatus(200)->assertJsonPath('data.status', 'in_progress');

        // Skip ahead is rejected, backwards is rejected.
        $this->actingAs($this->admin)->postJson("/api/tickets/{$ticket->fresh()->id}/status", ['status' => 'open'])
            ->assertStatus(422);

        $open = Ticket::factory()->create(['reported_by' => $this->warga->id, 'status' => 'open']);
        $this->actingAs($this->admin)->postJson("/api/tickets/{$open->id}/status", ['status' => 'resolved'])
            ->assertStatus(422);
    }

    public function test_warga_cannot_change_status_or_assign()
    {
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id]);

        $this->actingAs($this->warga)->postJson("/api/tickets/{$ticket->id}/status", ['status' => 'in_progress'])
            ->assertStatus(403);
        $this->actingAs($this->warga)->postJson("/api/tickets/{$ticket->id}/assign", ['assigned_to' => $this->admin->id])
            ->assertStatus(403);
    }

    public function test_admin_can_assign_pic()
    {
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id]);

        $this->actingAs($this->admin)->postJson("/api/tickets/{$ticket->id}/assign", ['assigned_to' => $this->admin->id])
            ->assertStatus(200)->assertJsonPath('data.assigned_to', $this->admin->id);
    }

    public function test_comments_are_append_only_and_scoped()
    {
        $mine = Ticket::factory()->create(['reported_by' => $this->warga->id]);
        $theirs = Ticket::factory()->create();

        $this->actingAs($this->warga)->postJson("/api/tickets/{$mine->id}/comments", ['comment' => '<p>Kapan diperbaiki?</p>'])
            ->assertStatus(201);
        $this->actingAs($this->warga)->postJson("/api/tickets/{$theirs->id}/comments", ['comment' => 'x'])
            ->assertStatus(403);
    }

    public function test_attachments_enforce_count_and_type_limits()
    {
        Storage::fake('public');
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id]);
        $photo = fn () => UploadedFile::fake()->image('lampu.jpg', 800, 600)->size(500);

        for ($i = 0; $i < 3; $i++) {
            $this->actingAs($this->warga)->postJson("/api/tickets/{$ticket->id}/attachments", ['photo' => $photo()])
                ->assertStatus(201);
        }

        // 4th photo rejected.
        $this->actingAs($this->warga)->postJson("/api/tickets/{$ticket->id}/attachments", ['photo' => $photo()])
            ->assertStatus(422);

        // Non-image rejected.
        $other = Ticket::factory()->create(['reported_by' => $this->warga->id]);
        $this->actingAs($this->warga)->postJson("/api/tickets/{$other->id}/attachments", [
            'photo' => UploadedFile::fake()->create('doc.txt', 100, 'text/plain'),
        ])->assertStatus(422);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/TicketTest.php`
Expected: FAIL — table `tickets` doesn't exist (no migration yet).

- [ ] **Step 3: Write the three migrations and run them**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reported_by')->constrained('users');
            $table->foreignId('house_id')->nullable()->constrained('houses');
            $table->string('title', 200);
            $table->text('description');
            $table->string('category', 100)->nullable();
            $table->string('status', 20)->default('open');
            $table->foreignId('assigned_to')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->text('comment');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_comments');
    }
};
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->string('file_path', 255);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_attachments');
    }
};
```

Save as `database/migrations/2026_09_09_000001_create_tickets_table.php`, `..._000002_create_ticket_comments_table.php`, `..._000003_create_ticket_attachments_table.php`, then run `php artisan migrate`.

- [ ] **Step 4: Write the two small models**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketComment extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['ticket_id', 'user_id', 'comment'];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketAttachment extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['ticket_id', 'file_path'];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }
}
```

- [ ] **Step 5: Write the service**

```php
<?php

namespace App\Services;

use App\Models\HouseResident;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketComment;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TicketService
{
    public const STATUS_ORDER = ['open' => 0, 'in_progress' => 1, 'resolved' => 2];

    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $user): Ticket
    {
        $data['description'] = $this->htmlSanitizer->sanitize($data['description']);
        $data['reported_by'] = $user->id;
        $data['house_id'] ??= HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->value('house_id');

        return Ticket::create($data);
    }

    public function changeStatus(Ticket $ticket, string $newStatus, User $actor): Ticket
    {
        $order = self::STATUS_ORDER;

        if (! isset($order[$newStatus]) || $order[$newStatus] <= $order[$ticket->status]) {
            throw ValidationException::withMessages(['status' => ['Transisi status tidak valid. Tiket hanya bergerak maju: open → in_progress → resolved.']]);
        }

        $oldStatus = $ticket->status;

        DB::transaction(function () use ($ticket, $newStatus, $oldStatus, $actor): void {
            $ticket->update(['status' => $newStatus]);
            TicketComment::create([
                'ticket_id' => $ticket->id,
                'user_id' => $actor->id,
                'comment' => "Status diubah {$oldStatus} → {$newStatus} oleh {$actor->name}.",
            ]);
        });

        return $ticket->fresh(['reporter', 'assignee'])->loadCount(['comments', 'attachments']);
    }

    public function assign(Ticket $ticket, int $userId): Ticket
    {
        $ticket->update(['assigned_to' => $userId]);

        return $ticket->fresh(['reporter', 'assignee'])->loadCount(['comments', 'attachments']);
    }

    public function addComment(Ticket $ticket, string $comment, User $user): TicketComment
    {
        return $ticket->comments()->create([
            'user_id' => $user->id,
            'comment' => $this->htmlSanitizer->sanitize($comment),
        ]);
    }

    public function addAttachment(Ticket $ticket, UploadedFile $file): TicketAttachment
    {
        if ($ticket->attachments()->count() >= 3) {
            throw ValidationException::withMessages(['photo' => ['Maksimal 3 foto per tiket.']]);
        }

        return $ticket->attachments()->create([
            'file_path' => $file->store('ticket-attachments', 'public'),
        ]);
    }
}
```

- [ ] **Step 6: Write the resources and controller**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class TicketAttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'url' => Storage::url($this->file_path),
            'created_at' => $this->created_at,
        ];
    }
}
```

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketCommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user_name' => $this->user?->name,
            'comment' => $this->comment,
            'created_at' => $this->created_at,
        ];
    }
}
```

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'status' => $this->status,
            'reported_by' => $this->reported_by,
            'reporter_name' => $this->reporter?->name,
            'house_id' => $this->house_id,
            'assigned_to' => $this->assigned_to,
            'assignee_name' => $this->assignee?->name,
            'comments_count' => $this->comments_count ?? $this->comments()->count(),
            'attachments' => TicketAttachmentResource::collection($this->whenLoaded('attachments')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TicketCommentResource;
use App\Http\Resources\TicketResource;
use App\Http\Resources\TicketAttachmentResource;
use App\Models\Ticket;
use App\Services\TicketService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private TicketService $ticketService) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Ticket::query()->with(['reporter:id,name', 'assignee:id,name', 'attachments'])
            ->withCount(['comments', 'attachments']);

        if (! $user->hasPermission('tickets.view-all')) {
            $query->where('reported_by', $user->id);
        }

        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $this->applySorting($query, $request, ['title', 'status', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), TicketResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string'],
            'category' => ['nullable', 'string', 'max:100'],
            'house_id' => ['nullable', 'integer', 'exists:houses,id'],
        ]);

        $ticket = $this->ticketService->create($validated, $request->user());

        return (new TicketResource($ticket->load(['reporter', 'assignee', 'attachments'])->loadCount(['comments', 'attachments'])))->response()->setStatusCode(201);
    }

    public function show(Ticket $ticket)
    {
        $this->authorize('view', $ticket);

        return new TicketResource($ticket->load(['reporter', 'assignee', 'attachments'])->loadCount(['comments', 'attachments']));
    }

    public function changeStatus(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:open,in_progress,resolved'],
        ]);

        return new TicketResource($this->ticketService->changeStatus($ticket, $validated['status'], $request->user()));
    }

    public function assign(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'assigned_to' => ['required', 'integer', 'exists:users,id'],
        ]);

        return new TicketResource($this->ticketService->assign($ticket, $validated['assigned_to']));
    }

    public function comments(Ticket $ticket)
    {
        $this->authorize('view', $ticket);

        $comments = $ticket->comments()->with('user:id,name')->orderBy('id')->get();

        return TicketCommentResource::collection($comments);
    }

    public function storeComment(Request $request, Ticket $ticket)
    {
        $this->authorize('comment', $ticket);

        $validated = $request->validate([
            'comment' => ['required', 'string', 'max:5000'],
        ]);

        $comment = $this->ticketService->addComment($ticket, $validated['comment'], $request->user());

        return (new TicketCommentResource($comment->load('user')))->response()->setStatusCode(201);
    }

    public function storeAttachment(Request $request, Ticket $ticket)
    {
        $this->authorize('attach', $ticket);

        $validated = $request->validate([
            'photo' => ['required', 'image', 'max:2048'],
        ]);

        $attachment = $this->ticketService->addAttachment($ticket, $validated['photo']);

        return (new TicketAttachmentResource($attachment))->response()->setStatusCode(201);
    }
}
```

- [ ] **Step 7: Add the routes**

In `routes/api.php`, add the import and routes after the forum block (or after announcements — keep with the other warga-facing domains):

```php
use App\Http\Controllers\Api\TicketController;
```

```php
    // Tickets
    Route::get('tickets', [TicketController::class, 'index'])->middleware('can:tickets.view');
    Route::post('tickets', [TicketController::class, 'store'])->middleware('can:tickets.create');
    Route::get('tickets/{ticket}', [TicketController::class, 'show'])->middleware('can:tickets.view');
    Route::post('tickets/{ticket}/status', [TicketController::class, 'changeStatus'])->middleware('can:tickets.manage-status');
    Route::post('tickets/{ticket}/assign', [TicketController::class, 'assign'])->middleware('can:tickets.assign');
    Route::get('tickets/{ticket}/comments', [TicketController::class, 'comments'])->middleware('can:tickets.view');
    Route::post('tickets/{ticket}/comments', [TicketController::class, 'storeComment'])->middleware('can:tickets.view');
    Route::post('tickets/{ticket}/attachments', [TicketController::class, 'storeAttachment'])->middleware('can:tickets.view');
```

- [ ] **Step 8: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/TicketTest.php`
Expected: PASS (7 tests)

- [ ] **Step 9: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_09_09_000001_create_tickets_table.php database/migrations/2026_09_09_000002_create_ticket_comments_table.php database/migrations/2026_09_09_000003_create_ticket_attachments_table.php app/Models/TicketComment.php app/Models/TicketAttachment.php app/Services/TicketService.php app/Http/Controllers/Api/TicketController.php app/Http/Resources/TicketResource.php app/Http/Resources/TicketCommentResource.php app/Http/Resources/TicketAttachmentResource.php routes/api.php tests/Feature/Api/TicketTest.php
git commit -m "feat: add ticketing backend with forward-only status and attachments"
```

---

### Task 3: Notification wiring (database channel + WA job + endpoints)

**Files:**
- Create: `database/migrations/2026_09_09_000004_create_notifications_table.php` (via `php artisan make:notifications-table`, then verify contents)
- Create: `app/Notifications/TicketStatusUpdated.php` (via `php artisan make:notification TicketStatusUpdated`, then fill in)
- Create: `app/Jobs/SendTicketWhatsappJob.php`
- Create: `app/Http/Controllers/Api/NotificationController.php`
- Modify: `app/Services/TicketService.php` (wire notify + dispatch into `changeStatus`)
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/TicketNotificationTest.php`

**Interfaces:**
- Consumes: `TicketService::changeStatus()` (Task 2), `WahaService::sendMessage(string, string): bool`, reporter phone via `$ticket->reporter->resident->phone_number` (nullable chain — reporter may lack resident/phone).
- Produces: `POST` flows unchanged; `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`. Payload `{ticket_id, title, old_status, new_status, actor_name}`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Api;

use App\Jobs\SendTicketWhatsappJob;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class TicketNotificationTest extends TestCase
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

    public function test_status_change_notifies_reporter_and_dispatches_wa_job()
    {
        Queue::fake();
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id, 'status' => 'open']);

        $this->actingAs($this->admin)->postJson("/api/tickets/{$ticket->id}/status", ['status' => 'in_progress'])
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $this->warga->id,
            'notifiable_type' => User::class,
        ]);
        Queue::assertPushed(SendTicketWhatsappJob::class);
    }

    public function test_status_change_succeeds_even_without_reporter_phone()
    {
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id, 'status' => 'open']);

        $this->actingAs($this->admin)->postJson("/api/tickets/{$ticket->id}/status", ['status' => 'in_progress'])
            ->assertStatus(200);
        $this->assertEquals('in_progress', $ticket->fresh()->status);
    }

    public function test_wa_job_skips_silently_when_no_phone_number()
    {
        Http::fake();
        $ticket = Ticket::factory()->create(['reported_by' => $this->warga->id]);

        (new SendTicketWhatsappJob($ticket->id, 'open', 'in_progress'))->handle(app(\App\Services\WahaService::class));

        Http::assertNothingSent();
    }

    public function test_user_can_list_and_read_own_notifications()
    {
        $this->warga->notify(new \App\Notifications\TicketStatusUpdated(1, 'Lampu Mati', 'open', 'in_progress', 'Admin RT'));

        $this->actingAs($this->warga)->getJson('/api/notifications')->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $id = $this->warga->notifications()->first()->id;
        $this->actingAs($this->warga)->postJson("/api/notifications/{$id}/read")->assertStatus(200);
        $this->assertNotNull($this->warga->notifications()->first()->fresh()->read_at);

        $this->warga->notify(new \App\Notifications\TicketStatusUpdated(1, 'Lampu Mati', 'open', 'in_progress', 'Admin RT'));
        $this->actingAs($this->warga)->postJson('/api/notifications/read-all')->assertStatus(200);
        $this->assertEquals(0, $this->warga->unreadNotifications()->count());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/TicketNotificationTest.php`
Expected: FAIL — table `notifications` doesn't exist.

- [ ] **Step 3: Generate the notifications migration and the notification class**

```bash
php artisan make:notifications-table
php artisan make:notification TicketStatusUpdated
```

Verify the generated migration creates the standard `notifications` table (id uuid primary, type, morphs notifiable, text data, read_at nullable, timestamps), then run `php artisan migrate`. Fill the notification:

```php
<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TicketStatusUpdated extends Notification
{
    use Queueable;

    public function __construct(
        public int $ticketId,
        public string $ticketTitle,
        public string $oldStatus,
        public string $newStatus,
        public string $actorName,
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
            'ticket_id' => $this->ticketId,
            'title' => $this->ticketTitle,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'actor_name' => $this->actorName,
        ];
    }
}
```

- [ ] **Step 4: Write the WA job**

```php
<?php

namespace App\Jobs;

use App\Models\Ticket;
use App\Services\WahaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendTicketWhatsappJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $ticketId,
        public string $oldStatus,
        public string $newStatus,
    ) {}

    public function handle(WahaService $wahaService): void
    {
        $ticket = Ticket::with('reporter.resident')->find($this->ticketId);

        if ($ticket === null) {
            return;
        }

        $phone = $ticket->reporter?->resident?->phone_number;

        if (blank($phone)) {
            Log::info('SendTicketWhatsappJob: reporter has no phone number, skipping', [
                'ticket_id' => $this->ticketId,
            ]);

            return;
        }

        $message = "[SIWarga] Tiket #{$ticket->id} ({$ticket->title}): {$this->oldStatus} → {$this->newStatus}.";

        try {
            $sent = $wahaService->sendMessage($phone, $message);

            if (! $sent) {
                Log::warning('SendTicketWhatsappJob: WAHA rejected the message', [
                    'ticket_id' => $this->ticketId,
                ]);
            }
        } catch (\Throwable $exception) {
            Log::warning('SendTicketWhatsappJob: send failed', [
                'ticket_id' => $this->ticketId,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
```

- [ ] **Step 5: Wire notifications into `TicketService::changeStatus`**

After the `DB::transaction(...)` block in `changeStatus`, insert (before `return`):

```php
        $reporter = $ticket->reporter;

        if ($reporter !== null) {
            try {
                $reporter->notify(new TicketStatusUpdated(
                    $ticket->id,
                    $ticket->title,
                    $oldStatus,
                    $newStatus,
                    $actor->name,
                ));
            } catch (\Throwable $exception) {
                Log::warning('TicketService: failed to store status notification', [
                    'ticket_id' => $ticket->id,
                    'error' => $exception->getMessage(),
                ]);
            }

            SendTicketWhatsappJob::dispatch($ticket->id, $oldStatus, $newStatus);
        }
```

Add imports `use App\Jobs\SendTicketWhatsappJob;`, `use App\Notifications\TicketStatusUpdated;`, `use Illuminate\Support\Facades\Log;`. Note: dispatching to the queue never throws under normal drivers; the try/catch covers the database notify, and the job itself is failure-safe — so the status change always returns 200.

- [ ] **Step 6: Write the notification controller and routes**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()->notifications()
            ->orderByRaw('read_at IS NULL DESC')
            ->orderByDesc('created_at')
            ->paginate($request->per_page ?? 10);

        return response()->json([
            'data' => $notifications->items(),
            'current_page' => $notifications->currentPage(),
            'last_page' => $notifications->lastPage(),
            'per_page' => $notifications->perPage(),
            'total' => $notifications->total(),
        ]);
    }

    public function markRead(Request $request, string $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['data' => null, 'message' => 'Ditandai dibaca']);
    }

    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['data' => null, 'message' => 'Semua ditandai dibaca']);
    }
}
```

```php
use App\Http\Controllers\Api\NotificationController;
use App\Notifications\TicketStatusUpdated;
```

```php
    // Notifications (own only, no permission gate beyond auth)
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('notifications/{id}/read', [NotificationController::class, 'markRead']);
```

(Route order matters: `read-all` before `{id}/read` so `read-all` isn't captured as an id.)

- [ ] **Step 7: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/TicketNotificationTest.php`
Expected: PASS (4 tests)

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_09_09_000004_create_notifications_table.php app/Notifications/TicketStatusUpdated.php app/Jobs/SendTicketWhatsappJob.php app/Http/Controllers/Api/NotificationController.php app/Services/TicketService.php routes/api.php tests/Feature/Api/TicketNotificationTest.php
git commit -m "feat: add ticket notifications via database channel and WA job"
```

---

### Task 4: Suggestions backend (migration, model, controller, throttle, routes)

**Files:**
- Create: `database/migrations/2026_09_09_000005_create_anonymous_suggestions_table.php`
- Create: `app/Models/AnonymousSuggestion.php`
- Create: `app/Http/Controllers/Api/SuggestionController.php`
- Create: `app/Http/Resources/SuggestionResource.php`
- Modify: `app/Providers/AppServiceProvider.php` (throttle `suggestions`)
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/SuggestionTest.php`

**Interfaces:**
- Consumes: `SuggestionPolicy` (Task 1). Produces: `POST /api/suggestions` (throttled, identity-free), `GET /api/suggestions`, `POST /api/suggestions/{suggestion}/mark-reviewed`.

- [ ] **Step 1: Write the failing test**

```php
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/SuggestionTest.php`
Expected: FAIL — table `anonymous_suggestions` doesn't exist.

- [ ] **Step 3: Write the migration, model, resource, controller**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anonymous_suggestions', function (Blueprint $table) {
            $table->id();
            $table->text('content');
            $table->string('status', 20)->default('new');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anonymous_suggestions');
    }
};
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AnonymousSuggestion extends Model
{
    use HasFactory;

    protected $fillable = ['content', 'status'];
}
```

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SuggestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'content' => $this->content,
            'status' => $this->status,
            'created_at' => $this->created_at,
        ];
    }
}
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SuggestionResource;
use App\Models\AnonymousSuggestion;
use Illuminate\Http\Request;

class SuggestionController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
        ]);

        // Deliberately no user reference: anonymous by design.
        $suggestion = AnonymousSuggestion::create($validated);

        return (new SuggestionResource($suggestion))->response()->setStatusCode(201);
    }

    public function index(Request $request)
    {
        $query = AnonymousSuggestion::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $query->orderByDesc('id');

        return $this->paginated($query->paginate($request->per_page ?? 10), SuggestionResource::class);
    }

    public function markReviewed(AnonymousSuggestion $suggestion)
    {
        $suggestion->update(['status' => 'reviewed']);

        return new SuggestionResource($suggestion);
    }
}
```

- [ ] **Step 4: Register the throttle and routes**

In `registerRateLimiters()` add:

```php
        RateLimiter::for('suggestions', function (Request $request) {
            return Limit::perMinute(3)->by($request->user()?->id ?? $request->ip());
        });
```

```php
use App\Http\Controllers\Api\SuggestionController;
```

```php
    // Suggestions (anonymous submit, admin inbox)
    Route::post('suggestions', [SuggestionController::class, 'store'])->middleware(['can:suggestions.create', 'throttle:suggestions']);
    Route::get('suggestions', [SuggestionController::class, 'index'])->middleware('can:suggestions.view');
    Route::post('suggestions/{suggestion}/mark-reviewed', [SuggestionController::class, 'markReviewed'])->middleware('can:suggestions.view');
```

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/SuggestionTest.php`
Expected: PASS (2 tests)

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_09_09_000005_create_anonymous_suggestions_table.php app/Models/AnonymousSuggestion.php app/Http/Controllers/Api/SuggestionController.php app/Http/Resources/SuggestionResource.php app/Providers/AppServiceProvider.php routes/api.php tests/Feature/Api/SuggestionTest.php
git commit -m "feat: add anonymous suggestion box with throttled submit"
```

---

### Task 5: Ticketing frontend (list, report, detail, admin actions)

**Files:**
- Modify: `src/types/api.ts` (append at end)
- Modify: `src/components/layout/data/sidebar-data.ts`
- Create: `src/services/tickets.ts`
- Create: `src/hooks/use-tickets.ts`
- Create: `src/features/siwarga-tickets/tickets-page.tsx`
- Create: `src/features/siwarga-tickets/ticket-detail-dialog.tsx`
- Create: `src/features/siwarga-tickets/report-ticket-dialog.tsx`
- Create: `src/routes/_authenticated/tickets/index.tsx`

**Interfaces:**
- Consumes: ticket endpoints (Task 2); `useUsers` + `usersService` for the PIC select; `useHasPermission('tickets.manage-status' | 'tickets.assign')` for admin actions.
- Produces: route `/tickets` + sidebar entry. Accessible names mandated for Task 8 e2e: `Lapor Masalah` button, title placeholder `Judul laporan`, description placeholder `Ceritakan masalahnya`, `Kirim Laporan` submit, file input label `Foto (maks 3)`, comment placeholder `Tulis komentar`, `Kirim Komentar` submit, status control `Ubah Status`.

- [ ] **Step 1: Append the types**

Append to the end of `src/types/api.ts`:

```ts
export type TicketStatus = 'open' | 'in_progress' | 'resolved'

export interface TicketAttachment {
  id: number
  url: string
  created_at: string | null
}

export interface Ticket {
  id: number
  title: string
  description: string
  category: string | null
  status: TicketStatus
  reported_by: number
  reporter_name: string | null
  house_id: number | null
  assigned_to: number | null
  assignee_name: string | null
  comments_count: number
  attachments: TicketAttachment[]
  created_at: string
  updated_at: string
}

export interface TicketComment {
  id: number
  user_id: number
  user_name: string | null
  comment: string
  created_at: string | null
}

export interface CreateTicketRequest {
  title: string
  description: string
  category?: string
  house_id?: number
}

export interface TicketFilter {
  search?: string
  status?: TicketStatus
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}
```

- [ ] **Step 2: Write the service and hooks**

`src/services/tickets.ts`:

```ts
import type {
  ApiResponse,
  PaginatedResponse,
  Ticket,
  TicketComment,
  TicketAttachment,
  TicketFilter,
  CreateTicketRequest,
} from '@/types/api'
import api from './api'

export const ticketsService = {
  getAll: (params?: TicketFilter) =>
    api.get<PaginatedResponse<Ticket>>('/api/tickets', { params }),
  getById: (id: number) => api.get<ApiResponse<Ticket>>(`/api/tickets/${id}`),
  create: (data: CreateTicketRequest) =>
    api.post<ApiResponse<Ticket>>('/api/tickets', data),
  changeStatus: (id: number, status: string) =>
    api.post<ApiResponse<Ticket>>(`/api/tickets/${id}/status`, { status }),
  assign: (id: number, assigned_to: number) =>
    api.post<ApiResponse<Ticket>>(`/api/tickets/${id}/assign`, { assigned_to }),
  getComments: (id: number) =>
    api.get<ApiResponse<TicketComment[]>>(`/api/tickets/${id}/comments`),
  addComment: (id: number, comment: string) =>
    api.post<ApiResponse<TicketComment>>(`/api/tickets/${id}/comments`, {
      comment,
    }),
  uploadAttachment: (id: number, photo: File) => {
    const form = new FormData()
    form.append('photo', photo)
    return api.post<ApiResponse<TicketAttachment>>(
      `/api/tickets/${id}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },
}
```

`src/hooks/use-tickets.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ticketsService } from '@/services/tickets'
import type { TicketFilter, CreateTicketRequest } from '@/types/api'
import { toast } from 'sonner'

export function useTickets(params?: TicketFilter) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => ticketsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useTicket(id: number | null) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsService.getById(id as number),
    select: (res) => res.data.data,
    enabled: id !== null,
  })
}

export function useTicketComments(id: number | null) {
  return useQuery({
    queryKey: ['ticket-comments', id],
    queryFn: () => ticketsService.getComments(id as number),
    select: (res) => res.data.data,
    enabled: id !== null,
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTicketRequest) => ticketsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      toast.success('Laporan berhasil dikirim')
    },
    onError: () => toast.error('Gagal mengirim laporan'),
  })
}

export function useChangeTicketStatus(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: string) => ticketsService.changeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      toast.success('Status tiket diperbarui')
    },
    onError: () => toast.error('Gagal memperbarui status'),
  })
}

export function useAssignTicket(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assigned_to: number) => ticketsService.assign(id, assigned_to),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      toast.success('PIC berhasil ditugaskan')
    },
    onError: () => toast.error('Gagal menugaskan PIC'),
  })
}

export function useAddTicketComment(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (comment: string) => ticketsService.addComment(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-comments', id] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
      toast.success('Komentar terkirim')
    },
    onError: () => toast.error('Gagal mengirim komentar'),
  })
}

export function useUploadTicketAttachment(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (photo: File) => ticketsService.uploadAttachment(id, photo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
      toast.success('Foto berhasil diunggah')
    },
    onError: () => toast.error('Gagal mengunggah foto'),
  })
}
```

- [ ] **Step 3: Write the pages, route, and sidebar**

`tickets-page.tsx`: `Header` + `Search` + `Main` pattern; `Lapor Masalah` button opening `report-ticket-dialog.tsx` (title input placeholder `Judul laporan`, category, description placeholder `Ceritakan masalahnya`, submit `Kirim Laporan`); list of ticket cards (title, status `Badge`, category, reporter, date) with search + status `Select` filter synced to URL via `getRouteApi`; click opens `ticket-detail-dialog.tsx` (description HTML sanitized server-side, attachments thumbnails, comments list + `Tulis komentar` + `Kirim Komentar` keeping draft on error, photo upload with `Foto (maks 3)` label, admin-only `Ubah Status` select with next-status options + PIC `Select` fed by `useUsers`, both gated by `useHasPermission`). Error states with `Coba lagi` retry; keyboard-accessible cards (lesson from Fase 1 review).
Route `src/routes/_authenticated/tickets/index.tsx`: zod schema (page, pageSize, status enum optional, search) + `TicketsPage`.
Sidebar: new group after `Komunikasi`:

```ts
{
  title: 'Layanan',
  items: [
    {
      title: 'Tiket Pengaduan',
      url: '/tickets',
      icon: Wrench,
      permission: 'tickets.view',
    },
  ],
},
```

Import `Wrench` from `lucide-react` alongside the existing icon imports.

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: builds clean. Commit:

```bash
git commit -m "feat: add ticketing list, report, and detail UI"
```

---

### Task 6: Notifications frontend (bell + page)

**Files:**
- Modify: `src/types/api.ts` (append)
- Create: `src/services/notifications.ts`
- Create: `src/hooks/use-notifications.ts`
- Create: `src/components/layout/notification-bell.tsx`
- Create: `src/features/siwarga-notifications/notifications-page.tsx`
- Create: `src/routes/_authenticated/notifications/index.tsx`
- Modify: `src/features/siwarga-tickets/tickets-page.tsx`, `src/features/siwarga-suggestions/suggestions-page.tsx` (mount bell in Header; suggestions page arrives in Task 7 — if this task runs first, mount bell in tickets + notifications pages and let Task 7 mount it in suggestions)

**Interfaces:**
- Consumes: notification endpoints (Task 3). Produces: `NotificationBell` (badge + link to `/notifications`); route `/notifications` (no sidebar entry — reached via bell; keeps nav clean).

- [ ] **Step 1: Append the types, service, and hooks**

```ts
export interface AppNotification {
  id: string
  type: string
  data: {
    ticket_id: number
    title: string
    old_status: string
    new_status: string
    actor_name: string
  }
  read_at: string | null
  created_at: string
}
```

`src/services/notifications.ts`:

```ts
import type { ApiResponse, PaginatedResponse, AppNotification } from '@/types/api'
import api from './api'

export const notificationsService = {
  getAll: (page?: number) =>
    api.get<PaginatedResponse<AppNotification>>('/api/notifications', {
      params: { page },
    }),
  markRead: (id: string) =>
    api.post<ApiResponse<null>>(`/api/notifications/${id}/read`),
  markAllRead: () => api.post<ApiResponse<null>>('/api/notifications/read-all'),
}
```

`src/hooks/use-notifications.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsService } from '@/services/notifications'
import { toast } from 'sonner'

export function useNotifications(page?: number) {
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationsService.getAll(page),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
    refetchInterval: 60_000,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsService.getAll(),
    select: (res) => res.data.data.filter((n) => n.read_at === null).length,
    refetchInterval: 60_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => toast.error('Gagal menandai notifikasi'),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Semua notifikasi ditandai dibaca')
    },
    onError: () => toast.error('Gagal menandai notifikasi'),
  })
}
```

- [ ] **Step 2: Write the bell, page, and route**

`src/components/layout/notification-bell.tsx`: a `Link` to `/notifications` wrapping a `Button variant='ghost' size='icon'` with `Bell` icon + `aria-label='Notifikasi'`; unread badge (`useUnreadCount`, render count when > 0). Silent on fetch error (no toast in bell — never disturb the header).
`notifications-page.tsx`: list rows (ticket title, `old → new`, actor, date, unread highlight), click marks read + navigates to `/tickets` (pass ticket id via search? keep simple: mark read only, user navigates manually — no, better: mark read and open tickets page; implement as mark-read on click without navigation to avoid cross-page state complexity), `Tandai semua dibaca` button, error + retry states.
Route `src/routes/_authenticated/notifications/index.tsx`: minimal zod schema (page) + page.
Mount `<NotificationBell />` in the `Header` of tickets-page (and suggestions/notifications pages; coordinate with Task 7 — whoever lands second adds the mount to suggestions-page).

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: builds clean. Commit:

```bash
git commit -m "feat: add notification bell and list UI"
```

---

### Task 7: Suggestions frontend (form + admin inbox)

**Files:**
- Modify: `src/types/api.ts` (append)
- Modify: `src/components/layout/data/sidebar-data.ts` (add to `Layanan` group)
- Create: `src/services/suggestions.ts`
- Create: `src/hooks/use-suggestions.ts`
- Create: `src/features/siwarga-suggestions/suggestions-page.tsx`
- Create: `src/routes/_authenticated/suggestions/index.tsx`

**Interfaces:**
- Consumes: suggestion endpoints (Task 4). Produces: route `/suggestions` (form for all with `suggestions.create`; inbox table for `suggestions.view`); sidebar entry permission `suggestions.create` (visible to warga + admin). Accessible names mandated for Task 8 e2e: textarea placeholder `Tulis saran Anda`, `Kirim Saran` button. Mount `NotificationBell` in its Header.

- [ ] **Step 1: Append the types, service, and hooks**

```ts
export interface Suggestion {
  id: number
  content: string
  status: 'new' | 'reviewed'
  created_at: string
}

export interface SuggestionFilter {
  status?: 'new' | 'reviewed'
  page?: number
  per_page?: number
}
```

`src/services/suggestions.ts`:

```ts
import type {
  ApiResponse,
  PaginatedResponse,
  Suggestion,
  SuggestionFilter,
} from '@/types/api'
import api from './api'

export const suggestionsService = {
  create: (content: string) =>
    api.post<ApiResponse<Suggestion>>('/api/suggestions', { content }),
  getAll: (params?: SuggestionFilter) =>
    api.get<PaginatedResponse<Suggestion>>('/api/suggestions', { params }),
  markReviewed: (id: number) =>
    api.post<ApiResponse<Suggestion>>(`/api/suggestions/${id}/mark-reviewed`),
}
```

`src/hooks/use-suggestions.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { suggestionsService } from '@/services/suggestions'
import type { SuggestionFilter } from '@/types/api'
import { toast } from 'sonner'

export function useSuggestions(params?: SuggestionFilter) {
  return useQuery({
    queryKey: ['suggestions', params],
    queryFn: () => suggestionsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useCreateSuggestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => suggestionsService.create(content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] })
      toast.success('Saran berhasil dikirim secara anonim')
    },
    onError: () => toast.error('Gagal mengirim saran'),
  })
}

export function useMarkSuggestionReviewed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => suggestionsService.markReviewed(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] })
      toast.success('Saran ditandai sudah dibaca')
    },
    onError: () => toast.error('Gagal menandai saran'),
  })
}
```

- [ ] **Step 2: Write the page, route, and sidebar**

`suggestions-page.tsx`: explainer card (anonymous guarantee text `Saran Anda terkirim tanpa nama`), textarea placeholder `Tulis saran Anda` + `Kirim Saran` button (keep draft on error); inbox section rendered only with `useHasPermission('suggestions.view')` (status filter new/reviewed, `Tandai dibaca` per row); error + retry states; `NotificationBell` in Header.
Route + zod schema (page, status) + sidebar entry in `Layanan` group:

```ts
{
  title: 'Saran Anonim',
  url: '/suggestions',
  icon: MessageSquare,
  permission: 'suggestions.create',
},
```

`MessageSquare` is already imported in sidebar-data (Forum Warga entry) — reuse, no new import. Ensure `NotificationBell` is mounted here (coordinate with Task 6).

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: builds clean. Commit:

```bash
git commit -m "feat: add anonymous suggestion form and inbox UI"
```

---

### Task 8: e2e coverage + full verification

**Files:**
- Create: `src/frontend/e2e/siwarga/fase-2-ticketing.spec.ts`
- (No source changes expected; if a test exposes a bug, fix under TDD in the owning task's files and note it in the commit.)

**Interfaces:**
- Consumes: helpers from `e2e/siwarga/setup.ts` (`test` with `adminPage`/`wargaPage` fixtures, `apiToken`, `apiPost`, `uid`, `expect`); accessible names mandated in Tasks 5–7. Photo upload via in-memory buffer (no fixture file): `page.setInputFiles('input[type="file"]', { name: 'lampu.png', mimeType: 'image/png', buffer: Buffer.from(<1px png bytes>) })` — 1px PNG bytes: `[137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,0,1,0,0,5,0,1,13,10,45,180,0,0,0,0,73,69,78,68,174,66,96,130]`.

- [ ] **Step 1: Write the e2e spec**

```ts
import { test, expect, apiToken, apiPost, uid, defaultAdmin } from './setup'

test('warga reports a ticket with photo and sees it in the list', async ({
  wargaPage,
}) => {
  const title = `E2E Tiket ${uid()}`
  await wargaPage.goto('/tickets')
  await wargaPage.getByRole('button', { name: 'Lapor Masalah' }).click()
  await wargaPage.getByPlaceholder('Judul laporan').fill(title)
  await wargaPage.getByPlaceholder('Ceritakan masalahnya').fill('Lampu gang mati.')
  await wargaPage.getByRole('button', { name: 'Kirim Laporan' }).click()
  await expect(wargaPage.getByText(title)).toBeVisible()
})

test('admin status change notifies the warga bell', async ({
  adminPage,
  wargaPage,
  request,
}) => {
  void adminPage
  const wargaToken = await apiToken(request, 'warga@siwarga.test', 'password')
  const adminToken = await apiToken(request, defaultAdmin.email, 'password')
  const title = `E2E Status ${uid()}`
  const created = await apiPost(request, wargaToken, '/api/tickets', {
    title,
    description: 'Lampu gang mati total.',
  })
  const id = (created as { id: number }).id

  const res = await request.post(
    `http://localhost:8000/api/tickets/${id}/status`,
    {
      data: { status: 'in_progress' },
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  )
  expect(res.ok()).toBeTruthy()

  await wargaPage.goto('/notifications')
  await expect(wargaPage.getByText(title).first()).toBeVisible()
  await expect(wargaPage.getByText(/in_progress/).first()).toBeVisible()
})

test('anonymous suggestion lands in the admin inbox', async ({
  wargaPage,
  adminPage,
}) => {
  const content = `E2E Saran ${uid()} mohon ronda ditertibkan`
  await wargaPage.goto('/suggestions')
  await wargaPage.getByPlaceholder('Tulis saran Anda').fill(content)
  await wargaPage.getByRole('button', { name: 'Kirim Saran' }).click()
  await expect(wargaPage.getByText('anonim', { exact: false })).toBeVisible()

  await adminPage.goto('/suggestions')
  await expect(adminPage.getByText(content)).toBeVisible()
})

If Task 5–7 markup differs in placeholder wording, prefer adjusting selectors to the implemented accessible names (title text, button roles) over changing UI — but keep the mandated names (`Lapor Masalah`, `Kirim Laporan`, `Ubah Status`, `Tulis komentar`, `Kirim Komentar`, `Kirim Saran`) intact.

- [ ] **Step 2: Run the new spec (backend + frontend dev servers must be running)**

Run: `npx playwright test e2e/siwarga/fase-2-ticketing.spec.ts`
Expected: PASS (3 tests). Photo upload uses the in-memory PNG buffer (no fixture file). Never hit the publish-style endpoints; status change dispatches the WA job to queue — assert the database notification + status, not WA delivery.

- [ ] **Step 3: Run the full verification**

```bash
composer test        # backend: config:clear + pint --test + phpstan + phpunit
npm run build        # frontend: tsc -b && vite build
npm run test         # frontend: vitest run (known pre-existing kerberos/vi.mock env failures — triage only)
npx playwright test  # full e2e suite incl. pre-existing tests
```

Expected: backend phpunit green (triage any red as pre-existing-with-evidence vs new); build green; vitest failures only the known pre-existing env ones on untouched files; playwright fully green. Commit the spec:

```bash
git add src/frontend/e2e/siwarga/fase-2-ticketing.spec.ts
git commit -m "test: add Fase 2 ticketing e2e (report, notify, suggest)"
```
