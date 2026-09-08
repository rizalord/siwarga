# Fase 1 Sisa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the warga-facing side of Fase 1: scoped announcement list/detail with auto read-receipts, polling & voting (admin CRUD + one-vote-per-user + gated results), and forum diskusi (threads + posts with owner/admin moderation) — backend API + React UI + tests.

**Architecture:** Three vertical slices, each Controller → Policy → Service on the backend (the established `2026-07-30-backend-service-pattern`) and a `siwarga-*` feature module with thin axios service + TanStack Query hooks on the frontend. Warga announcement targeting, poll result visibility, and forum delete rights are all enforced server-side via policies; the frontend only gates button visibility with `useHasPermission`.

**Tech Stack:** Laravel 13, PHPUnit, MySQL, React 19 + TanStack Query/Router, existing `HtmlSanitizer`, existing `ActivityLogObserver`, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-09-08-fase-1-sisa-design.md` (all 4 sections approved by user).

## Global Constraints

- Follow Pint formatting (`vendor/bin/pint --dirty --format agent`) before each PHP commit.
- Every change must be programmatically tested (TDD: failing test first, then minimal implementation).
- Poll options are immutable after creation — no add/remove-option endpoints.
- Forum has no edit endpoints — create + delete only.
- WhatsApp sends are never triggered from these flows (do NOT call the publish endpoint in tests/e2e; set `published_at` directly when fixture data needs to be visible).
- Frontend toasts in Bahasa Indonesia; reuse `DataTable*` primitives, `use-table-url-state`, `Header`/`Main` layout, and the `contact-messages` page pattern.
- When adding/changing an API endpoint, keep the MSW handler in sync if one exists for that domain (no MSW handler exists yet for announcements/polls/forum — none to update).

---

## File map

| File | Responsibility |
|---|---|
| `src/backend/app/Models/Permission.php` | +5 system permissions |
| `src/backend/app/Policies/PollPolicy.php` (new) | poll authorization incl. time-window + voted checks |
| `src/backend/app/Policies/ForumThreadPolicy.php` (new) | thread authorization (owner or `forum.manage`) |
| `src/backend/app/Policies/ForumPostPolicy.php` (new) | post authorization (owner or `forum.manage`) |
| `src/backend/app/Models/Announcement.php` | `scopeVisibleToWarga` targeting scope |
| `src/backend/app/Policies/AnnouncementPolicy.php` | `viewForWarga` per-instance check |
| `src/backend/app/Http/Resources/WargaAnnouncementResource.php` (new) | warga shape + `is_read`/`read_at` |
| `src/backend/app/Http/Controllers/Api/WargaAnnouncementController.php` (new) | read-only scoped index/show + auto read-receipt |
| `src/backend/app/Services/PollService.php` (new) | poll CRUD + vote with race-safe duplicate handling |
| `src/backend/app/Http/Controllers/Api/PollController.php` (new) | poll endpoints + vote + results |
| `src/backend/app/Http/Resources/PollResource.php` (new) | poll shape without vote counts |
| `src/backend/app/Services/ForumService.php` (new) | thread/post create + cascading soft-delete |
| `src/backend/app/Http/Controllers/Api/ForumThreadController.php` (new) | thread endpoints |
| `src/backend/app/Http/Controllers/Api/ForumPostController.php` (new) | nested post endpoints |
| `src/backend/app/Http/Resources/ForumThreadResource.php` (new) | thread shape + `posts_count` |
| `src/backend/app/Http/Resources/ForumPostResource.php` (new) | post shape + author name |
| `src/backend/routes/api.php` | new routes |
| `src/backend/app/Providers/AppServiceProvider.php` | new gates + observe `Poll`, `ForumThread` |
| `src/backend/database/seeders/RoleSeeder.php` | bendahara/warga permission lists |
| `src/frontend/src/types/api.ts` | TS types for the 3 domains |
| `src/frontend/src/services/warga-announcements.ts`, `polls.ts`, `forum.ts` (new) | thin axios clients |
| `src/frontend/src/hooks/use-warga-announcements.ts`, `use-polls.ts`, `use-forum.ts` (new) | TanStack Query hooks |
| `src/frontend/src/features/siwarga-announcements/warga-announcements-page.tsx` (new) | warga cards + detail dialog |
| `src/frontend/src/features/siwarga-polls/*` (new) | admin table + form + vote UI |
| `src/frontend/src/features/siwarga-forum/*` (new) | thread list + detail + reply |
| `src/frontend/src/routes/_authenticated/pengumuman/index.tsx`, `polls/index.tsx`, `forum/index.tsx`, `forum/$threadId.tsx` (new) | routes + zod search schemas |
| `src/frontend/src/components/layout/data/sidebar-data.ts` | nav entries |

---

### Task 1: polls/forum permissions, policies, gates, RoleSeeder

**Files:**
- Modify: `src/backend/app/Models/Permission.php`
- Modify: `src/backend/app/Providers/AppServiceProvider.php`
- Modify: `src/backend/database/seeders/RoleSeeder.php`
- Create: `src/backend/app/Policies/PollPolicy.php`
- Create: `src/backend/app/Policies/ForumThreadPolicy.php`
- Create: `src/backend/app/Policies/ForumPostPolicy.php`
- Test: `src/backend/tests/Unit/PollPolicyTest.php`
- Test: `src/backend/tests/Unit/ForumPolicyTest.php`

**Interfaces:**
- Consumes: `User::hasPermission()`, `Permission::SYSTEM_PERMISSIONS`, existing `RoleSeeder`/`PermissionSeeder` pattern from Plan C Task 1.
- Produces: `PollPolicy::{viewAny,view,create,update,delete,vote,results}`, `ForumThreadPolicy::{viewAny,view,create,delete}`, `ForumPostPolicy::{viewAny,view,create,delete}` — consumed via Laravel policy auto-discovery (`$this->authorize()`) by Tasks 3–4 controllers.
- Produces: gates `polls.view`, `polls.manage`, `polls.vote`, `forum.view` — consumed by route middleware in Tasks 2–4 (`vote`/`results`/update/delete use `$this->authorize()`, not `can:` middleware, same precedent as Plan C).

- [ ] **Step 1: Write the failing policy tests**

```php
<?php

namespace Tests\Unit;

use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\Poll;
use App\Models\Role;
use App\Models\User;
use App\Policies\ForumPostPolicy;
use App\Policies\ForumThreadPolicy;
use App\Policies\PollPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PollPolicyTest extends TestCase
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

    public function test_admin_can_manage_polls()
    {
        $admin = $this->actingUser('admin');
        $policy = new PollPolicy;

        $this->assertTrue($policy->viewAny($admin));
        $this->assertTrue($policy->create($admin));

        $upcoming = Poll::factory()->make(['starts_at' => now()->addDay(), 'ends_at' => now()->addWeek()]);
        $this->assertTrue($policy->update($admin, $upcoming));

        $ongoing = Poll::factory()->make(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);
        $this->assertFalse($policy->update($admin, $ongoing));
        $this->assertTrue($policy->delete($admin, $ongoing));
        $this->assertTrue($policy->results($admin, $ongoing));
    }

    public function test_warga_can_vote_only_inside_period_and_only_once()
    {
        $warga = $this->actingUser('warga');
        $policy = new PollPolicy;

        $this->assertTrue($policy->viewAny($warga));
        $this->assertFalse($policy->create($warga));

        $ongoing = Poll::factory()->create(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);
        $this->assertTrue($policy->vote($warga, $ongoing));
        $this->assertFalse($policy->results($warga, $ongoing));

        $ended = Poll::factory()->create(['starts_at' => now()->subWeek(), 'ends_at' => now()->subDay()]);
        $this->assertFalse($policy->vote($warga, $ended));
        $this->assertTrue($policy->results($warga, $ended));
    }

    public function test_bendahara_can_view_but_not_vote_or_manage()
    {
        $bendahara = $this->actingUser('bendahara');
        $policy = new PollPolicy;
        $ongoing = Poll::factory()->make(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);

        $this->assertTrue($policy->viewAny($bendahara));
        $this->assertFalse($policy->create($bendahara));
        $this->assertFalse($policy->vote($bendahara, $ongoing));
    }
}

class ForumPolicyTest extends TestCase
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

    public function test_warga_can_create_and_delete_own_but_not_others()
    {
        $warga = $this->actingUser('warga');
        $other = User::factory()->create();
        $threadPolicy = new ForumThreadPolicy;
        $postPolicy = new ForumPostPolicy;

        $this->assertTrue($threadPolicy->viewAny($warga));
        $this->assertTrue($threadPolicy->create($warga));

        $mine = ForumThread::factory()->make(['created_by' => $warga->id]);
        $theirs = ForumThread::factory()->make(['created_by' => $other->id]);
        $this->assertTrue($threadPolicy->delete($warga, $mine));
        $this->assertFalse($threadPolicy->delete($warga, $theirs));

        $myPost = ForumPost::factory()->make(['user_id' => $warga->id]);
        $theirPost = ForumPost::factory()->make(['user_id' => $other->id]);
        $this->assertTrue($postPolicy->delete($warga, $myPost));
        $this->assertFalse($postPolicy->delete($warga, $theirPost));
    }

    public function test_admin_can_delete_any_thread_or_post()
    {
        $admin = $this->actingUser('admin');
        $other = User::factory()->create();

        $this->assertTrue((new ForumThreadPolicy)->delete($admin, ForumThread::factory()->make(['created_by' => $other->id])));
        $this->assertTrue((new ForumPostPolicy)->delete($admin, ForumPost::factory()->make(['user_id' => $other->id])));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Unit/PollPolicyTest.php tests/Unit/ForumPolicyTest.php`
Expected: FAIL — classes `App\Policies\PollPolicy`, `App\Policies\ForumThreadPolicy`, `App\Policies\ForumPostPolicy` not found.

- [ ] **Step 3: Add the permissions**

In `src/backend/app/Models/Permission.php`, add after the `'contact-messages.view'` line:

```php
        'contact-messages.view' => 'Lihat pesan kontak',
        'polls.view' => 'Lihat polling',
        'polls.manage' => 'Kelola polling',
        'polls.vote' => 'Ikut voting polling',
        'forum.view' => 'Lihat dan ikut forum diskusi',
        'forum.manage' => 'Moderasi forum diskusi',
```

- [ ] **Step 4: Write the three policies**

```php
<?php

namespace App\Policies;

use App\Models\Poll;
use App\Models\User;

class PollPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('polls.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('polls.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('polls.manage');
    }

    public function update(User $user, Poll $poll): bool
    {
        return $user->hasPermission('polls.manage') && now()->lt($poll->starts_at);
    }

    public function delete(User $user, Poll $poll): bool
    {
        return $user->hasPermission('polls.manage');
    }

    public function vote(User $user, Poll $poll): bool
    {
        return $user->hasPermission('polls.vote')
            && now()->between($poll->starts_at, $poll->ends_at)
            && ! $poll->votes()->where('user_id', $user->id)->exists();
    }

    public function results(User $user, Poll $poll): bool
    {
        if ($user->hasPermission('polls.manage')) {
            return true;
        }

        return $poll->votes()->where('user_id', $user->id)->exists()
            || now()->gt($poll->ends_at);
    }
}
```

```php
<?php

namespace App\Policies;

use App\Models\ForumThread;
use App\Models\User;

class ForumThreadPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('forum.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('forum.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('forum.view');
    }

    public function delete(User $user, ForumThread $thread): bool
    {
        return $user->hasPermission('forum.manage') || $thread->created_by === $user->id;
    }
}
```

```php
<?php

namespace App\Policies;

use App\Models\ForumPost;
use App\Models\User;

class ForumPostPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('forum.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('forum.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('forum.view');
    }

    public function delete(User $user, ForumPost $post): bool
    {
        return $user->hasPermission('forum.manage') || $post->user_id === $user->id;
    }
}
```

- [ ] **Step 5: Register the gates**

In `src/backend/app/Providers/AppServiceProvider.php`, add imports for `PollPolicy` and `ForumThreadPolicy`, then register in `registerGates()` after the contact-messages line:

```php
        // Contact messages
        Gate::define('contact-messages.view', [ContactMessagePolicy::class, 'viewAny']);

        // Polls & forum
        Gate::define('polls.view', [PollPolicy::class, 'viewAny']);
        Gate::define('polls.manage', [PollPolicy::class, 'create']);
        Gate::define('polls.vote', fn (User $user) => $user->hasPermission('polls.vote'));
        Gate::define('forum.view', [ForumThreadPolicy::class, 'viewAny']);
```

- [ ] **Step 6: Update `RoleSeeder`**

Bendahara list gains `'polls.view', 'forum.view',`; Warga list gains `'polls.view', 'polls.vote', 'forum.view',`:

```php
            'reports.view',
            'announcements.manage', 'announcements.view',
            'polls.view', 'forum.view',
        ])->pluck('id'));

        // Warga can only view bills/payments within their own resident scope.
        $warga->permissions()->sync(Permission::whereIn('name', [
            'bills.view', 'bills.view.own', 'payments.view', 'payments.view.own',
            'announcements.view',
            'polls.view', 'polls.vote', 'forum.view',
        ])->pluck('id'));
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `php artisan test --compact tests/Unit/PollPolicyTest.php tests/Unit/ForumPolicyTest.php`
Expected: PASS (5 tests)

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add src/backend/app/Models/Permission.php src/backend/app/Providers/AppServiceProvider.php src/backend/database/seeders/RoleSeeder.php src/backend/app/Policies/PollPolicy.php src/backend/app/Policies/ForumThreadPolicy.php src/backend/app/Policies/ForumPostPolicy.php src/backend/tests/Unit/PollPolicyTest.php src/backend/tests/Unit/ForumPolicyTest.php
git commit -m "feat: add polls/forum permissions, policies, and gates"
```

---

### Task 2: Warga announcements backend (scoped index/show + read-receipt)

**Files:**
- Modify: `src/backend/app/Models/Announcement.php`
- Modify: `src/backend/app/Policies/AnnouncementPolicy.php`
- Create: `src/backend/app/Http/Resources/WargaAnnouncementResource.php`
- Create: `src/backend/app/Http/Controllers/Api/WargaAnnouncementController.php`
- Modify: `src/backend/routes/api.php`
- Test: `src/backend/tests/Feature/Api/WargaAnnouncementTest.php`

**Interfaces:**
- Consumes: `Announcement`, `AnnouncementRead`, `HouseResident`, `AnnouncementPolicy` (Task 1 of Plan C), base `Controller::paginated()`/`applySorting()`.
- Produces: `GET /api/warga/announcements`, `GET /api/warga/announcements/{announcement}` — consumed by Task 5's frontend service. `Announcement::scopeVisibleToWarga` + `AnnouncementPolicy::viewForWarga` share the same rule (published + broadcast-or-targeted-to-user's-current-houses; `announcements.manage` holders bypass).

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\House;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WargaAnnouncementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $warga;

    protected House $wargaHouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $resident = Resident::factory()->create();
        $this->wargaHouse = House::factory()->create();
        $this->wargaHouse->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);

        $this->warga = User::factory()->create(['resident_id' => $resident->id]);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    public function test_warga_sees_broadcast_and_own_house_targeted_announcements()
    {
        Announcement::factory()->create(['title' => 'Broadcast Info', 'published_at' => now()]);
        $targeted = Announcement::factory()->create(['title' => 'Target Rumah Saya', 'published_at' => now()]);
        $targeted->targets()->create(['house_id' => $this->wargaHouse->id]);

        $otherHouse = House::factory()->create();
        $other = Announcement::factory()->create(['title' => 'Rumah Lain', 'published_at' => now()]);
        $other->targets()->create(['house_id' => $otherHouse->id]);

        Announcement::factory()->create(['title' => 'Draft Belum Publish', 'published_at' => null]);

        $response = $this->actingAs($this->warga)->getJson('/api/warga/announcements');

        $response->assertStatus(200);
        $titles = collect($response->json('data'))->pluck('title')->all();
        $this->assertContains('Broadcast Info', $titles);
        $this->assertContains('Target Rumah Saya', $titles);
        $this->assertNotContains('Rumah Lain', $titles);
        $this->assertNotContains('Draft Belum Publish', $titles);
    }

    public function test_warga_cannot_open_non_targeted_announcement()
    {
        $otherHouse = House::factory()->create();
        $announcement = Announcement::factory()->create(['published_at' => now()]);
        $announcement->targets()->create(['house_id' => $otherHouse->id]);

        $response = $this->actingAs($this->warga)->getJson("/api/warga/announcements/{$announcement->id}");

        $response->assertStatus(403);
    }

    public function test_show_records_read_receipt_idempotently()
    {
        $announcement = Announcement::factory()->create(['published_at' => now()]);

        $this->actingAs($this->warga)->getJson("/api/warga/announcements/{$announcement->id}")->assertStatus(200)
            ->assertJsonPath('data.is_read', true);
        $this->actingAs($this->warga)->getJson("/api/warga/announcements/{$announcement->id}")->assertStatus(200);

        $this->assertEquals(1, AnnouncementRead::where('announcement_id', $announcement->id)->where('user_id', $this->warga->id)->count());
    }

    public function test_admin_bypasses_target_filter_without_recording_read()
    {
        $otherHouse = House::factory()->create();
        $announcement = Announcement::factory()->create(['published_at' => now()]);
        $announcement->targets()->create(['house_id' => $otherHouse->id]);

        $this->actingAs($this->admin)->getJson('/api/warga/announcements')->assertStatus(200)
            ->assertJsonCount(1, 'data');
        $this->actingAs($this->admin)->getJson("/api/warga/announcements/{$announcement->id}")->assertStatus(200);
        $this->assertEquals(0, AnnouncementRead::where('announcement_id', $announcement->id)->count());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/WargaAnnouncementTest.php`
Expected: FAIL — route `/api/warga/announcements` not found.

- [ ] **Step 3: Add the scope to `Announcement`**

Add imports `use App\Models\HouseResident;` and `use Illuminate\Database\Eloquent\Builder;`, then add the method:

```php
    /**
     * Published announcements visible to the given user: broadcasts plus
     * those targeted at the user's current houses. Holders of
     * announcements.manage (admin) bypass the target filter.
     */
    public function scopeVisibleToWarga(Builder $query, User $user): Builder
    {
        $query->whereNotNull('published_at');

        if ($user->hasPermission('announcements.manage')) {
            return $query;
        }

        $houseIds = HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->pluck('house_id');

        return $query->where(function (Builder $q) use ($houseIds): void {
            $q->whereDoesntHave('targets')
                ->orWhereHas('targets', fn (Builder $t) => $t->whereIn('house_id', $houseIds));
        });
    }
```

- [ ] **Step 4: Add `viewForWarga` to `AnnouncementPolicy`**

```php
    /**
     * Warga-side visibility: published + broadcast-or-targeted.
     * announcements.manage holders (admin) bypass the target filter.
     */
    public function viewForWarga(User $user, Announcement $announcement): bool
    {
        if (! $user->hasPermission('announcements.view')) {
            return false;
        }

        if ($announcement->published_at === null) {
            return false;
        }

        if ($user->hasPermission('announcements.manage')) {
            return true;
        }

        if (! $announcement->targets()->exists()) {
            return true;
        }

        return HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->whereIn('house_id', $announcement->targets()->pluck('house_id'))
            ->exists();
    }
```

Add `use App\Models\HouseResident;` to the policy imports.

- [ ] **Step 5: Write the resource and controller**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WargaAnnouncementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $read = $this->reads->first();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'content' => $this->content,
            'category' => $this->category,
            'published_at' => $this->published_at,
            'is_read' => $read !== null,
            'read_at' => $read?->read_at,
            'created_at' => $this->created_at,
        ];
    }
}
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WargaAnnouncementResource;
use App\Models\Announcement;
use App\Models\AnnouncementRead;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WargaAnnouncementController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Announcement::query()
            ->visibleToWarga($user)
            ->with(['reads' => fn ($q) => $q->where('user_id', $user->id)]);

        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        $this->applySorting($query, $request, ['title', 'category', 'published_at', 'created_at'], 'published_at');

        return $this->paginated($query->paginate($request->per_page ?? 10), WargaAnnouncementResource::class);
    }

    public function show(Request $request, Announcement $announcement)
    {
        $this->authorize('viewForWarga', $announcement);

        $user = $request->user();

        if (! $user->hasPermission('announcements.manage')) {
            try {
                AnnouncementRead::updateOrCreate(
                    ['announcement_id' => $announcement->id, 'user_id' => $user->id],
                    ['read_at' => now()]
                );
            } catch (\Throwable $exception) {
                Log::warning('WargaAnnouncementController: failed to record read receipt', [
                    'announcement_id' => $announcement->id,
                    'user_id' => $user->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        $announcement->load(['reads' => fn ($q) => $q->where('user_id', $user->id)]);

        return new WargaAnnouncementResource($announcement);
    }
}
```

- [ ] **Step 6: Add the routes**

In `src/backend/routes/api.php`, add the import and the routes after the `// Announcements` block:

```php
use App\Http\Controllers\Api\WargaAnnouncementController;
```

```php
    // Warga announcements (scoped, read-only)
    Route::get('warga/announcements', [WargaAnnouncementController::class, 'index'])->middleware('can:announcements.view');
    Route::get('warga/announcements/{announcement}', [WargaAnnouncementController::class, 'show'])->middleware('can:announcements.view');
```

- [ ] **Step 7: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/WargaAnnouncementTest.php`
Expected: PASS (4 tests)

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add src/backend/app/Models/Announcement.php src/backend/app/Policies/AnnouncementPolicy.php src/backend/app/Http/Resources/WargaAnnouncementResource.php src/backend/app/Http/Controllers/Api/WargaAnnouncementController.php src/backend/routes/api.php src/backend/tests/Feature/Api/WargaAnnouncementTest.php
git commit -m "feat: add warga-scoped announcements with auto read-receipt"
```

---

### Task 3: Polls backend (CRUD + vote + gated results)

**Files:**
- Create: `src/backend/app/Services/PollService.php`
- Create: `src/backend/app/Http/Controllers/Api/PollController.php`
- Create: `src/backend/app/Http/Resources/PollResource.php`
- Modify: `src/backend/routes/api.php`
- Modify: `src/backend/app/Providers/AppServiceProvider.php` (observe `Poll`)
- Test: `src/backend/tests/Feature/Api/PollTest.php`

**Interfaces:**
- Consumes: `PollPolicy` (Task 1), `Poll`/`PollOption`/`PollVote` models, `Controller::paginated()`/`applySorting()`.
- Produces: `PollService::{create(array $data, array $options, User $user), update(Poll, array): Poll, delete(Poll): void, vote(Poll, PollOption, User): PollVote}`; routes `GET/POST /api/polls`, `GET/PUT/DELETE /api/polls/{poll}`, `POST /api/polls/{poll}/vote`, `GET /api/polls/{poll}/results`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PollTest extends TestCase
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

    protected function makePoll(array $overrides = []): Poll
    {
        $poll = Poll::factory()->create($overrides);
        PollOption::factory()->create(['poll_id' => $poll->id, 'label' => 'Setuju']);
        PollOption::factory()->create(['poll_id' => $poll->id, 'label' => 'Tidak Setuju']);

        return $poll->fresh('options');
    }

    public function test_admin_can_create_poll_with_options()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/polls', [
            'title' => 'Iuran Khusus?',
            'description' => 'Vote ya atau tidak.',
            'starts_at' => now()->addDay()->toDateTimeString(),
            'ends_at' => now()->addWeek()->toDateTimeString(),
            'options' => ['Setuju', 'Tidak Setuju'],
        ]);

        $response->assertStatus(201)->assertJsonPath('data.title', 'Iuran Khusus?');
        $this->assertCount(2, $response->json('data.options'));
        $this->assertDatabaseHas('polls', ['title' => 'Iuran Khusus?']);
    }

    public function test_warga_cannot_create_poll()
    {
        $response = $this->actingAs($this->warga)->postJson('/api/polls', [
            'title' => 'X',
            'starts_at' => now()->addDay()->toDateTimeString(),
            'ends_at' => now()->addWeek()->toDateTimeString(),
            'options' => ['A', 'B'],
        ]);

        $response->assertStatus(403);
    }

    public function test_warga_can_vote_once_inside_period()
    {
        $poll = $this->makePoll(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);

        $response = $this->actingAs($this->warga)->postJson("/api/polls/{$poll->id}/vote", [
            'option_id' => $poll->options->first()->id,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('poll_votes', ['poll_id' => $poll->id, 'user_id' => $this->warga->id]);

        $this->actingAs($this->warga)->postJson("/api/polls/{$poll->id}/vote", [
            'option_id' => $poll->options->last()->id,
        ])->assertStatus(422);
    }

    public function test_vote_outside_period_is_rejected()
    {
        $poll = $this->makePoll(['starts_at' => now()->subWeek(), 'ends_at' => now()->subDay()]);

        $this->actingAs($this->warga)->postJson("/api/polls/{$poll->id}/vote", [
            'option_id' => $poll->options->first()->id,
        ])->assertStatus(422);
    }

    public function test_vote_with_foreign_option_is_rejected()
    {
        $poll = $this->makePoll(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);
        $other = $this->makePoll();

        $this->actingAs($this->warga)->postJson("/api/polls/{$poll->id}/vote", [
            'option_id' => $other->options->first()->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['option_id']);
    }

    public function test_results_hidden_until_voted_or_ended()
    {
        $poll = $this->makePoll(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);

        $this->actingAs($this->warga)->getJson("/api/polls/{$poll->id}/results")->assertStatus(403);

        $this->actingAs($this->warga)->postJson("/api/polls/{$poll->id}/vote", [
            'option_id' => $poll->options->first()->id,
        ])->assertStatus(200);

        $this->actingAs($this->warga)->getJson("/api/polls/{$poll->id}/results")->assertStatus(200)
            ->assertJsonPath('data.total_votes', 1);
    }

    public function test_admin_can_update_before_start_but_not_after()
    {
        $poll = $this->makePoll(['starts_at' => now()->addDay(), 'ends_at' => now()->addWeek()]);

        $this->actingAs($this->admin)->putJson("/api/polls/{$poll->id}", ['title' => 'Judul Baru'])
            ->assertStatus(200)->assertJsonPath('data.title', 'Judul Baru');

        $poll->update(['starts_at' => now()->subDay()]);

        $this->actingAs($this->admin)->putJson("/api/polls/{$poll->id}", ['title' => 'Diubah Lagi'])
            ->assertStatus(403);
    }

    public function test_admin_can_delete_poll_with_votes()
    {
        $poll = $this->makePoll(['starts_at' => now()->subDay(), 'ends_at' => now()->addDay()]);
        PollVote::create(['poll_id' => $poll->id, 'option_id' => $poll->options->first()->id, 'user_id' => $this->warga->id, 'voted_at' => now()]);

        $this->actingAs($this->admin)->deleteJson("/api/polls/{$poll->id}")->assertStatus(200);
        $this->assertDatabaseMissing('polls', ['id' => $poll->id]);
        $this->assertDatabaseMissing('poll_votes', ['poll_id' => $poll->id]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/PollTest.php`
Expected: FAIL — route `/api/polls` not found.

- [ ] **Step 3: Write the service**

```php
<?php

namespace App\Services;

use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PollService
{
    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, string>  $options
     */
    public function create(array $data, array $options, User $user): Poll
    {
        return DB::transaction(function () use ($data, $options, $user): Poll {
            $poll = Poll::create([...$data, 'created_by' => $user->id]);

            foreach ($options as $label) {
                $poll->options()->create(['label' => $label]);
            }

            return $poll->fresh(['options']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Poll $poll, array $data): Poll
    {
        $poll->update($data);

        return $poll->fresh(['options']);
    }

    public function delete(Poll $poll): void
    {
        DB::transaction(function () use ($poll): void {
            PollVote::where('poll_id', $poll->id)->delete();
            $poll->options()->delete();
            $poll->delete();
        });
    }

    public function vote(Poll $poll, PollOption $option, User $user): PollVote
    {
        if ($option->poll_id !== $poll->id) {
            throw ValidationException::withMessages(['option_id' => ['Opsi tidak termasuk dalam polling ini.']]);
        }

        if (! now()->between($poll->starts_at, $poll->ends_at)) {
            throw ValidationException::withMessages(['poll' => ['Voting hanya dibuka selama periode polling.']]);
        }

        if ($poll->votes()->where('user_id', $user->id)->exists()) {
            throw ValidationException::withMessages(['poll' => ['Anda sudah memberikan suara di polling ini.']]);
        }

        try {
            return PollVote::create([
                'poll_id' => $poll->id,
                'option_id' => $option->id,
                'user_id' => $user->id,
                'voted_at' => now(),
            ]);
        } catch (QueryException $exception) {
            throw ValidationException::withMessages(['poll' => ['Anda sudah memberikan suara di polling ini.']]);
        }
    }
}
```

- [ ] **Step 4: Write the resource**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PollResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'status' => now()->lt($this->starts_at) ? 'upcoming' : (now()->gt($this->ends_at) ? 'ended' : 'ongoing'),
            'options' => $this->options->map(fn ($option) => ['id' => $option->id, 'label' => $option->label])->values(),
            'has_voted' => (bool) ($this->has_voted ?? false),
            'user_voted_option_id' => $this->user_voted_option_id ?? null,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
        ];
    }
}
```

- [ ] **Step 5: Write the controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PollResource;
use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Services\PollService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class PollController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private PollService $pollService) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Poll::query()->with('options')
            ->withExists(['votes as has_voted' => fn ($q) => $q->where('user_id', $user->id)]);

        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        if ($request->filled('status')) {
            $query->when($request->status === 'upcoming', fn ($q) => $q->where('starts_at', '>', now()))
                ->when($request->status === 'ongoing', fn ($q) => $q->where('starts_at', '<=', now())->where('ends_at', '>=', now()))
                ->when($request->status === 'ended', fn ($q) => $q->where('ends_at', '<', now()));
        }

        $this->applySorting($query, $request, ['title', 'starts_at', 'ends_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), PollResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'options' => ['required', 'array', 'min:2'],
            'options.*' => ['string', 'max:150', 'distinct'],
        ]);

        $options = $validated['options'];
        unset($validated['options']);

        $poll = $this->pollService->create($validated, $options, $request->user());

        return (new PollResource($poll))->response()->setStatusCode(201);
    }

    public function show(Request $request, Poll $poll)
    {
        $poll->load('options');
        $vote = PollVote::where('poll_id', $poll->id)->where('user_id', $request->user()->id)->first();
        $poll->user_voted_option_id = $vote?->option_id;
        $poll->has_voted = $vote !== null;

        return new PollResource($poll);
    }

    public function update(Request $request, Poll $poll)
    {
        $this->authorize('update', $poll);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'date', 'after:starts_at'],
            'options' => ['prohibited'],
        ]);

        return new PollResource($this->pollService->update($poll, $validated));
    }

    public function destroy(Poll $poll)
    {
        $this->authorize('delete', $poll);

        $this->pollService->delete($poll);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function vote(Request $request, Poll $poll)
    {
        $this->authorize('vote', $poll);

        $validated = $request->validate([
            'option_id' => ['required', 'integer', 'exists:poll_options,id'],
        ]);

        $this->pollService->vote($poll, PollOption::findOrFail($validated['option_id']), $request->user());

        return response()->json(['data' => null, 'message' => 'Suara berhasil direkam']);
    }

    public function results(Request $request, Poll $poll)
    {
        $this->authorize('results', $poll);

        $poll->load(['options', 'votes']);
        $total = $poll->votes->count();

        return response()->json(['data' => [
            'poll_id' => $poll->id,
            'total_votes' => $total,
            'options' => $poll->options->map(fn ($option) => [
                'id' => $option->id,
                'label' => $option->label,
                'votes' => $poll->votes->where('option_id', $option->id)->count(),
                'percent' => $total > 0 ? round($poll->votes->where('option_id', $option->id)->count() / $total * 100, 1) : 0,
            ])->values(),
            'user_voted_option_id' => $poll->votes->firstWhere('user_id', $request->user()->id)?->option_id,
        ]]);
    }
}
```

- [ ] **Step 6: Add the routes and observer**

In `src/backend/routes/api.php`, add the import and routes after the warga-announcements block:

```php
use App\Http\Controllers\Api\PollController;
```

```php
    // Polls
    Route::get('polls', [PollController::class, 'index'])->middleware('can:polls.view');
    Route::post('polls', [PollController::class, 'store'])->middleware('can:polls.manage');
    Route::get('polls/{poll}', [PollController::class, 'show'])->middleware('can:polls.view');
    Route::put('polls/{poll}', [PollController::class, 'update']);
    Route::delete('polls/{poll}', [PollController::class, 'destroy']);
    Route::post('polls/{poll}/vote', [PollController::class, 'vote']);
    Route::get('polls/{poll}/results', [PollController::class, 'results']);
```

In `src/backend/app/Providers/AppServiceProvider.php`, add `Poll::class` to the `registerActivityLogObservers()` model list with its import.

- [ ] **Step 7: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/PollTest.php`
Expected: PASS (8 tests)

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add src/backend/app/Services/PollService.php src/backend/app/Http/Controllers/Api/PollController.php src/backend/app/Http/Resources/PollResource.php src/backend/routes/api.php src/backend/app/Providers/AppServiceProvider.php src/backend/tests/Feature/Api/PollTest.php
git commit -m "feat: add polls CRUD, vote, and gated results"
```

---

### Task 4: Forum backend (threads + nested posts)

**Files:**
- Create: `src/backend/app/Services/ForumService.php`
- Create: `src/backend/app/Http/Controllers/Api/ForumThreadController.php`
- Create: `src/backend/app/Http/Controllers/Api/ForumPostController.php`
- Create: `src/backend/app/Http/Resources/ForumThreadResource.php`
- Create: `src/backend/app/Http/Resources/ForumPostResource.php`
- Modify: `src/backend/routes/api.php`
- Modify: `src/backend/app/Providers/AppServiceProvider.php` (observe `ForumThread`)
- Test: `src/backend/tests/Feature/Api/ForumTest.php`

**Interfaces:**
- Consumes: `ForumThreadPolicy`/`ForumPostPolicy` (Task 1), `HtmlSanitizer::sanitize()` (same use as `AnnouncementService`), base `Controller` helpers.
- Produces: `ForumService::{createThread(string, User): ForumThread, deleteThread(ForumThread): void, createPost(ForumThread, string, User): ForumPost, deletePost(ForumPost): void}`; routes `GET/POST /api/forum-threads`, `GET/DELETE /api/forum-threads/{thread}`, `GET/POST /api/forum-threads/{thread}/posts`, `DELETE /api/forum-posts/{post}`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ForumTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $warga;

    protected User $otherWarga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        foreach (['warga', 'otherWarga'] as $prop) {
            $user = User::factory()->create();
            $user->roles()->attach(Role::where('name', 'warga')->first()->id);
            $user->load('roles.permissions');
            $this->{$prop} = $user;
        }
    }

    public function test_warga_can_create_thread_and_post()
    {
        $thread = $this->actingAs($this->warga)->postJson('/api/forum-threads', [
            'title' => 'Jadwal Ronda Baru',
        ])->assertStatus(201)->assertJsonPath('data.title', 'Jadwal Ronda Baru')->json('data');

        $this->actingAs($this->otherWarga)->postJson("/api/forum-threads/{$thread['id']}/posts", [
            'content' => '<p>Setuju!</p>',
        ])->assertStatus(201)->assertJsonPath('data.content', '<p>Setuju!</p>');
    }

    public function test_post_content_is_sanitized()
    {
        $thread = ForumThread::create(['title' => 'T', 'created_by' => $this->warga->id]);

        $response = $this->actingAs($this->warga)->postJson("/api/forum-threads/{$thread->id}/posts", [
            'content' => '<p>Halo</p><script>alert(1)</script>',
        ]);

        $response->assertStatus(201);
        $this->assertStringNotContainsString('<script>', $response->json('data.content'));
    }

    public function test_warga_can_delete_own_thread_but_not_others()
    {
        $mine = ForumThread::create(['title' => 'Milikku', 'created_by' => $this->warga->id]);
        $theirs = ForumThread::create(['title' => 'Milik Orang', 'created_by' => $this->otherWarga->id]);

        $this->actingAs($this->warga)->deleteJson("/api/forum-threads/{$mine->id}")->assertStatus(200);
        $this->actingAs($this->warga)->deleteJson("/api/forum-threads/{$theirs->id}")->assertStatus(403);
    }

    public function test_deleting_thread_soft_deletes_its_posts()
    {
        $thread = ForumThread::create(['title' => 'T', 'created_by' => $this->warga->id]);
        $post = ForumPost::create(['thread_id' => $thread->id, 'user_id' => $this->warga->id, 'content' => '<p>A</p>']);

        $this->actingAs($this->admin)->deleteJson("/api/forum-threads/{$thread->id}")->assertStatus(200);

        $this->assertSoftDeleted('forum_threads', ['id' => $thread->id]);
        $this->assertSoftDeleted('forum_posts', ['id' => $post->id]);
    }

    public function test_admin_can_delete_any_post()
    {
        $thread = ForumThread::create(['title' => 'T', 'created_by' => $this->warga->id]);
        $post = ForumPost::create(['thread_id' => $thread->id, 'user_id' => $this->warga->id, 'content' => '<p>A</p>']);

        $this->actingAs($this->admin)->deleteJson("/api/forum-posts/{$post->id}")->assertStatus(200);
        $this->assertSoftDeleted('forum_posts', ['id' => $post->id]);
    }

    public function test_thread_list_includes_posts_count()
    {
        $thread = ForumThread::create(['title' => 'Ramai', 'created_by' => $this->warga->id]);
        ForumPost::create(['thread_id' => $thread->id, 'user_id' => $this->warga->id, 'content' => '<p>A</p>']);

        $this->actingAs($this->warga)->getJson('/api/forum-threads')->assertStatus(200)
            ->assertJsonPath('data.0.posts_count', 1);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/ForumTest.php`
Expected: FAIL — route `/api/forum-threads` not found.

- [ ] **Step 3: Write the service**

```php
<?php

namespace App\Services;

use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ForumService
{
    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    public function createThread(string $title, User $user): ForumThread
    {
        return ForumThread::create(['title' => $title, 'created_by' => $user->id]);
    }

    public function deleteThread(ForumThread $thread): void
    {
        DB::transaction(function () use ($thread): void {
            $thread->posts()->delete();
            $thread->delete();
        });
    }

    public function createPost(ForumThread $thread, string $content, User $user): ForumPost
    {
        return $thread->posts()->create([
            'user_id' => $user->id,
            'content' => $this->htmlSanitizer->sanitize($content),
        ]);
    }

    public function deletePost(ForumPost $post): void
    {
        $post->delete();
    }
}
```

- [ ] **Step 4: Write the resources**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ForumThreadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'created_by' => $this->created_by,
            'created_by_name' => $this->createdBy?->name,
            'posts_count' => $this->posts_count ?? $this->posts()->count(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
```

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ForumPostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'thread_id' => $this->thread_id,
            'user_id' => $this->user_id,
            'user_name' => $this->user?->name,
            'content' => $this->content,
            'created_at' => $this->created_at,
        ];
    }
}
```

- [ ] **Step 5: Write the controllers**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ForumThreadResource;
use App\Models\ForumThread;
use App\Services\ForumService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class ForumThreadController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private ForumService $forumService) {}

    public function index(Request $request)
    {
        $query = ForumThread::query()->with('createdBy:id,name')->withCount('posts');

        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['title', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), ForumThreadResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
        ]);

        $thread = $this->forumService->createThread($validated['title'], $request->user());

        return (new ForumThreadResource($thread->load('createdBy')))->response()->setStatusCode(201);
    }

    public function show(ForumThread $thread)
    {
        return new ForumThreadResource($thread->load('createdBy')->loadCount('posts'));
    }

    public function destroy(ForumThread $thread)
    {
        $this->authorize('delete', $thread);

        $this->forumService->deleteThread($thread);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ForumPostResource;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Services\ForumService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class ForumPostController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private ForumService $forumService) {}

    public function index(Request $request, ForumThread $thread)
    {
        $query = $thread->posts()->with('user:id,name')->orderBy('id');

        return $this->paginated($query->paginate($request->per_page ?? 20), ForumPostResource::class);
    }

    public function store(Request $request, ForumThread $thread)
    {
        $validated = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);

        $post = $this->forumService->createPost($thread, $validated['content'], $request->user());

        return (new ForumPostResource($post->load('user')))->response()->setStatusCode(201);
    }

    public function destroy(ForumPost $post)
    {
        $this->authorize('delete', $post);

        $this->forumService->deletePost($post);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
```

- [ ] **Step 6: Add the routes and observer**

```php
use App\Http\Controllers\Api\ForumPostController;
use App\Http\Controllers\Api\ForumThreadController;
```

```php
    // Forum
    Route::get('forum-threads', [ForumThreadController::class, 'index'])->middleware('can:forum.view');
    Route::post('forum-threads', [ForumThreadController::class, 'store'])->middleware('can:forum.view');
    Route::get('forum-threads/{thread}', [ForumThreadController::class, 'show'])->middleware('can:forum.view');
    Route::delete('forum-threads/{thread}', [ForumThreadController::class, 'destroy']);
    Route::get('forum-threads/{thread}/posts', [ForumPostController::class, 'index'])->middleware('can:forum.view');
    Route::post('forum-threads/{thread}/posts', [ForumPostController::class, 'store'])->middleware('can:forum.view');
    Route::delete('forum-posts/{post}', [ForumPostController::class, 'destroy']);
```

Add `ForumThread::class` to the `registerActivityLogObservers()` model list with its import.

- [ ] **Step 7: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/ForumTest.php`
Expected: PASS (6 tests)

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add src/backend/app/Services/ForumService.php src/backend/app/Http/Controllers/Api/ForumThreadController.php src/backend/app/Http/Controllers/Api/ForumPostController.php src/backend/app/Http/Resources/ForumThreadResource.php src/backend/app/Http/Resources/ForumPostResource.php src/backend/routes/api.php src/backend/app/Providers/AppServiceProvider.php src/backend/tests/Feature/Api/ForumTest.php
git commit -m "feat: add forum threads and posts with owner/admin moderation"
```

---

### Task 5: Warga announcements frontend (cards + detail dialog)

**Files:**
- Modify: `src/frontend/src/types/api.ts` (append at end)
- Modify: `src/frontend/src/components/layout/data/sidebar-data.ts`
- Create: `src/frontend/src/services/warga-announcements.ts`
- Create: `src/frontend/src/hooks/use-warga-announcements.ts`
- Create: `src/frontend/src/features/siwarga-announcements/warga-announcements-page.tsx`
- Create: `src/frontend/src/routes/_authenticated/pengumuman/index.tsx`

**Interfaces:**
- Consumes: `GET /api/warga/announcements`, `GET /api/warga/announcements/{id}` (Task 2); `AnnouncementCategory` type; `useHasPermission('announcements.manage')` for the admin-hint banner.
- Produces: route `/pengumuman` (warga cards, mobile-first) + sidebar entry. Accessible names mandated for e2e (Task 8): search input placeholder `Cari pengumuman`, detail dialog role `dialog`.

- [ ] **Step 1: Append the types**

Append to the end of `src/frontend/src/types/api.ts`:

```ts
export interface WargaAnnouncement {
  id: number
  title: string
  slug: string | null
  content: string
  category: AnnouncementCategory
  published_at: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface WargaAnnouncementFilter {
  search?: string
  category?: AnnouncementCategory | AnnouncementCategory[]
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}
```

- [ ] **Step 2: Write the service and hooks**

`src/frontend/src/services/warga-announcements.ts`:

```ts
import type {
  ApiResponse,
  PaginatedResponse,
  WargaAnnouncement,
  WargaAnnouncementFilter,
} from '@/types/api'
import api from './api'

export const wargaAnnouncementsService = {
  getAll: (params?: WargaAnnouncementFilter) =>
    api.get<PaginatedResponse<WargaAnnouncement>>('/api/warga/announcements', {
      params,
    }),
  getById: (id: number) =>
    api.get<ApiResponse<WargaAnnouncement>>(`/api/warga/announcements/${id}`),
}
```

`src/frontend/src/hooks/use-warga-announcements.ts`:

```ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { wargaAnnouncementsService } from '@/services/warga-announcements'
import type { WargaAnnouncementFilter } from '@/types/api'

export function useWargaAnnouncements(params?: WargaAnnouncementFilter) {
  return useQuery({
    queryKey: ['warga-announcements', params],
    queryFn: () => wargaAnnouncementsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useWargaAnnouncement(id: number | null) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['warga-announcements', id],
    queryFn: async () => {
      const res = await wargaAnnouncementsService.getById(id as number)
      // Opening the detail marks it read server-side: refresh the list badge.
      qc.invalidateQueries({ queryKey: ['warga-announcements'] })
      return res.data.data
    },
    enabled: id !== null,
  })
}
```

- [ ] **Step 3: Write the page and route**

`src/frontend/src/features/siwarga-announcements/warga-announcements-page.tsx` — follow the `contact-messages/index.tsx` page pattern (`Header` + `Search` + `Main`, `getRouteApi` for search state). Layout: search input with placeholder `Cari pengumuman`, category `Select` filter, grid of `Card`s (title, category `Badge`, published date, `Belum dibaca` badge when `!is_read`), click opens a `Dialog` with the full content rendered via `dangerouslySetInnerHTML` (content is already sanitized server-side). On dialog open, `useWargaAnnouncement(selectedId)` fetches (recording the read) and the list query invalidates so the badge clears.

`src/frontend/src/routes/_authenticated/pengumuman/index.tsx` — mirror `routes/_authenticated/announcements/index.tsx` search schema (page, pageSize, category, search, sort, order) with component `WargaAnnouncementsPage`.

- [ ] **Step 4: Update the sidebar**

In `src/frontend/src/components/layout/data/sidebar-data.ts`: change the existing `Pengumuman` item's `permission` from `'announcements.view'` to `'announcements.manage'`, and add after it:

```ts
{
  title: 'Pengumuman Warga',
  url: '/pengumuman',
  icon: Megaphone,
  permission: 'announcements.view',
},
```

- [ ] **Step 5: Verify**

Run: `npm run build` (runs `tsc -b` + vite build)
Expected: builds clean. Then `git add` the 6 files and commit:

```bash
git commit -m "feat: add warga announcements list and detail UI"
```

---

### Task 6: Polls frontend (admin table + vote UI)

**Files:**
- Modify: `src/frontend/src/types/api.ts` (append)
- Modify: `src/frontend/src/components/layout/data/sidebar-data.ts`
- Create: `src/frontend/src/services/polls.ts`
- Create: `src/frontend/src/hooks/use-polls.ts`
- Create: `src/frontend/src/features/siwarga-polls/polls-page.tsx`
- Create: `src/frontend/src/features/siwarga-polls/poll-form.tsx`
- Create: `src/frontend/src/routes/_authenticated/polls/index.tsx`

**Interfaces:**
- Consumes: poll endpoints (Task 3). Admin-only controls (`Buat Polling` button, edit/delete) rendered only when `useHasPermission('polls.manage')`; vote button (`Vote`) only when `useHasPermission('polls.vote')` and `!has_voted` and `status === 'ongoing'`. Results section heading `Hasil sementara` shown only when result data is non-null. These accessible names are the contract Task 8's e2e relies on.

- [ ] **Step 1: Append the types**

```ts
export type PollStatus = 'upcoming' | 'ongoing' | 'ended'

export interface PollOption {
  id: number
  label: string
}

export interface Poll {
  id: number
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  status: PollStatus
  options: PollOption[]
  has_voted: boolean
  user_voted_option_id: number | null
  created_by: number
  created_at: string
}

export interface CreatePollRequest {
  title: string
  description?: string
  starts_at: string
  ends_at: string
  options: string[]
}

export interface PollResultOption {
  id: number
  label: string
  votes: number
  percent: number
}

export interface PollResults {
  poll_id: number
  total_votes: number
  options: PollResultOption[]
  user_voted_option_id: number | null
}

export interface PollFilter {
  search?: string
  status?: PollStatus
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}
```

- [ ] **Step 2: Write the service and hooks**

`src/frontend/src/services/polls.ts`:

```ts
import type {
  ApiResponse,
  PaginatedResponse,
  Poll,
  PollFilter,
  PollResults,
  CreatePollRequest,
} from '@/types/api'
import api from './api'

export const pollsService = {
  getAll: (params?: PollFilter) =>
    api.get<PaginatedResponse<Poll>>('/api/polls', { params }),
  getById: (id: number) => api.get<ApiResponse<Poll>>(`/api/polls/${id}`),
  create: (data: CreatePollRequest) =>
    api.post<ApiResponse<Poll>>('/api/polls', data),
  update: (id: number, data: Partial<CreatePollRequest>) =>
    api.put<ApiResponse<Poll>>(`/api/polls/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/api/polls/${id}`),
  vote: (id: number, option_id: number) =>
    api.post<ApiResponse<null>>(`/api/polls/${id}/vote`, { option_id }),
  results: (id: number) =>
    api.get<ApiResponse<PollResults>>(`/api/polls/${id}/results`),
}
```

`src/frontend/src/hooks/use-polls.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pollsService } from '@/services/polls'
import type { PollFilter, CreatePollRequest } from '@/types/api'
import { toast } from 'sonner'

export function usePolls(params?: PollFilter) {
  return useQuery({
    queryKey: ['polls', params],
    queryFn: () => pollsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function usePoll(id: number) {
  return useQuery({
    queryKey: ['polls', id],
    queryFn: () => pollsService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function usePollResults(id: number | null) {
  return useQuery({
    queryKey: ['polls', id, 'results'],
    queryFn: () => pollsService.results(id as number),
    select: (res) => res.data.data,
    enabled: id !== null,
    retry: false,
  })
}

export function useCreatePoll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePollRequest) => pollsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] })
      toast.success('Polling berhasil dibuat')
    },
    onError: () => toast.error('Gagal membuat polling'),
  })
}

export function useVotePoll(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (option_id: number) => pollsService.vote(id, option_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] })
      toast.success('Suara berhasil direkam')
    },
    onError: () => toast.error('Gagal merekam suara'),
  })
}

export function useDeletePoll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pollsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] })
      toast.success('Polling berhasil dihapus')
    },
    onError: () => toast.error('Gagal menghapus polling'),
  })
}
```

- [ ] **Step 3: Write the pages, route, and sidebar**

`polls-page.tsx`: list of poll `Card`s (title, description, status `Badge`, period dates). Each card: radio options + `Vote` button (warga, ongoing, not voted); after voting/ended (and results query succeeds) a `Hasil sementara` section with per-option progress bars (`votes` + `percent`); `Buat Polling` button (admin only) opening a dialog with `poll-form.tsx` (title, description, datetime-local starts/ends, dynamic options list min 2, submit via `useCreatePoll`).
`poll-form.tsx`: controlled form with `options: string[]` state, add/remove option rows (min 2 enforced, submit disabled otherwise).
Route `src/routes/_authenticated/polls/index.tsx`: zod search schema (page, pageSize, status, search) + `PollsPage` component.
Sidebar: add `{ title: 'Polling', url: '/polls', icon: Vote, permission: 'polls.view' }` in the warga-visible group — import `Vote` from `lucide-react` (same import style as `Megaphone`/`Mail`).

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: builds clean. Commit:

```bash
git commit -m "feat: add polls admin and voting UI"
```

---

### Task 7: Forum frontend (threads + replies)

**Files:**
- Modify: `src/frontend/src/types/api.ts` (append)
- Modify: `src/frontend/src/components/layout/data/sidebar-data.ts`
- Create: `src/frontend/src/services/forum.ts`
- Create: `src/frontend/src/hooks/use-forum.ts`
- Create: `src/frontend/src/features/siwarga-forum/forum-threads-page.tsx`
- Create: `src/frontend/src/features/siwarga-forum/forum-thread-detail-page.tsx`
- Create: `src/frontend/src/routes/_authenticated/forum/index.tsx`
- Create: `src/frontend/src/routes/_authenticated/forum/$threadId.tsx`

**Interfaces:**
- Consumes: forum endpoints (Task 4). Accessible-name contract for Task 8: new-thread input placeholder `Judul diskusi baru`, submit button `Buat Diskusi`, reply textarea placeholder `Tulis balasan`, submit button `Kirim Balasan`.

- [ ] **Step 1: Append the types**

```ts
export interface ForumThread {
  id: number
  title: string
  created_by: number
  created_by_name: string | null
  posts_count: number
  created_at: string
  updated_at: string
}

export interface ForumPost {
  id: number
  thread_id: number
  user_id: number
  user_name: string | null
  content: string
  created_at: string
}

export interface ForumThreadFilter {
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}
```

- [ ] **Step 2: Write the service and hooks**

`src/frontend/src/services/forum.ts`:

```ts
import type {
  ApiResponse,
  PaginatedResponse,
  ForumThread,
  ForumPost,
  ForumThreadFilter,
} from '@/types/api'
import api from './api'

export const forumService = {
  getThreads: (params?: ForumThreadFilter) =>
    api.get<PaginatedResponse<ForumThread>>('/api/forum-threads', { params }),
  getThread: (id: number) =>
    api.get<ApiResponse<ForumThread>>(`/api/forum-threads/${id}`),
  createThread: (title: string) =>
    api.post<ApiResponse<ForumThread>>('/api/forum-threads', { title }),
  deleteThread: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/forum-threads/${id}`),
  getPosts: (threadId: number, page?: number) =>
    api.get<PaginatedResponse<ForumPost>>(
      `/api/forum-threads/${threadId}/posts`,
      { params: { page } }
    ),
  createPost: (threadId: number, content: string) =>
    api.post<ApiResponse<ForumPost>>(`/api/forum-threads/${threadId}/posts`, {
      content,
    }),
  deletePost: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/forum-posts/${id}`),
}
```

`src/frontend/src/hooks/use-forum.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { forumService } from '@/services/forum'
import type { ForumThreadFilter } from '@/types/api'
import { toast } from 'sonner'

export function useForumThreads(params?: ForumThreadFilter) {
  return useQuery({
    queryKey: ['forum-threads', params],
    queryFn: () => forumService.getThreads(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useForumThread(id: number) {
  return useQuery({
    queryKey: ['forum-threads', id],
    queryFn: () => forumService.getThread(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useForumPosts(threadId: number, page?: number) {
  return useQuery({
    queryKey: ['forum-posts', threadId, page],
    queryFn: () => forumService.getPosts(threadId, page),
    select: (res) => res.data,
    enabled: !!threadId,
    placeholderData: (prev) => prev,
  })
}

export function useCreateThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title: string) => forumService.createThread(title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum-threads'] })
      toast.success('Diskusi berhasil dibuat')
    },
    onError: () => toast.error('Gagal membuat diskusi'),
  })
}

export function useCreatePost(threadId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => forumService.createPost(threadId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum-posts', threadId] })
      qc.invalidateQueries({ queryKey: ['forum-threads'] })
      toast.success('Balasan terkirim')
    },
    onError: () => toast.error('Gagal mengirim balasan'),
  })
}
```

- [ ] **Step 3: Write the pages, routes, and sidebar**

`forum-threads-page.tsx`: header row with input (placeholder `Judul diskusi baru`) + `Buat Diskusi` button; list of thread rows (link to `/forum/$threadId`, title, author, `posts_count`, date); delete button per row (visible when `useHasPermission('forum.manage')` — ownership delete for own threads: compare `thread.created_by` with `useAuthStore` user id, same pattern as `useHasPermission`).
`forum-thread-detail-page.tsx`: thread title header, posts list (author, date, sanitized HTML content), reply textarea (placeholder `Tulis balasan`, keep draft on error per spec §3) + `Kirim Balasan` button.
Routes: `forum/index.tsx` (search: page, search) and `forum/$threadId.tsx` (params parse `threadId` to number, render detail page).
Sidebar: add `{ title: 'Forum Warga', url: '/forum', icon: MessagesSquare, permission: 'forum.view' }` — import `MessagesSquare` from `lucide-react`.

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: builds clean. Commit:

```bash
git commit -m "feat: add forum threads and replies UI"
```

---

### Task 8: e2e coverage + full verification

**Files:**
- Create: `src/frontend/e2e/siwarga/fase-1-sisa.spec.ts`
- (No source changes expected; if a test exposes a bug, fix under TDD in the owning task's files and note it in the commit.)

**Interfaces:**
- Consumes: helpers from `e2e/siwarga/setup.ts` (`test` with `adminPage`/`wargaPage` fixtures, `apiToken`, `apiPost`, `uid`, `expect`); accessible names mandated in Tasks 5–7.

- [ ] **Step 1: Write the e2e spec**

```ts
import {
  test,
  expect,
  apiToken,
  apiPost,
  apiGet,
  uid,
  defaultAdmin,
} from './setup'

test('warga reads a targeted announcement and the badge clears', async ({
  wargaPage,
  request,
}) => {
  const token = await apiToken(request)
  const title = `E2E Pengumuman ${uid()}`
  await apiPost(request, token, '/api/announcements', {
    title,
    content: '<p>Info ronda malam ini.</p>',
    category: 'umum',
    published_at: new Date().toISOString(),
  })

  await wargaPage.goto('/pengumuman')
  await expect(wargaPage.getByText(title)).toBeVisible()
  await expect(wargaPage.getByText('Belum dibaca').first()).toBeVisible()

  await wargaPage.getByText(title).click()
  await expect(wargaPage.getByRole('dialog')).toBeVisible()
  await expect(wargaPage.getByRole('dialog').getByText(title)).toBeVisible()
})

test('warga votes once and sees results', async ({
  wargaPage,
  request,
}) => {
  const token = await apiToken(request, defaultAdmin.email, 'password')
  const title = `E2E Polling ${uid()}`
  const poll = await apiPost(request, token, '/api/polls', {
    title,
    description: 'Pilih satu.',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 86400000).toISOString(),
    options: ['Opsi A', 'Opsi B'],
  })

  await wargaPage.goto('/polls')
  await expect(wargaPage.getByText(title)).toBeVisible()
  await wargaPage
    .getByText(title)
    .locator('..')
    .getByRole('radio', { name: 'Opsi A' })
    .check()
  await wargaPage
    .getByText(title)
    .locator('..')
    .getByRole('button', { name: 'Vote' })
    .click()
  await expect(wargaPage.getByText('Hasil sementara')).toBeVisible()

  // Second vote via API is rejected (422).
  const wargaToken = await apiToken(request, 'warga@siwarga.test', 'password')
  const res = await request.post(
    `http://localhost:8000/api/polls/${(poll as { id: number }).id}/vote`,
    {
      data: { option_id: (await apiGet(request, wargaToken, `/api/polls/${(poll as { id: number }).id}`) as { data: { options: { id: number }[] } }).data.options[1].id },
      headers: { Authorization: `Bearer ${wargaToken}` },
    }
  )
  expect(res.status()).toBe(422)
})

test('warga creates a thread and replies', async ({ wargaPage }) => {
  const title = `E2E Diskusi ${uid()}`
  await wargaPage.goto('/forum')
  await wargaPage.getByPlaceholder('Judul diskusi baru').fill(title)
  await wargaPage.getByRole('button', { name: 'Buat Diskusi' }).click()
  await expect(wargaPage.getByText(title)).toBeVisible()

  await wargaPage.getByText(title).click()
  await wargaPage.getByPlaceholder('Tulis balasan').fill('Setuju, usul bagus.')
  await wargaPage.getByRole('button', { name: 'Kirim Balasan' }).click()
  await expect(wargaPage.getByText('Setuju, usul bagus.')).toBeVisible()
})
```

Note: the vote-radio markup depends on Task 6's implementation — if the UI uses buttons-per-option instead of radios, adjust the selectors to match (still text-anchored on the option label).

- [ ] **Step 2: Run the new spec (backend + frontend dev servers must be running)**

Run: `npx playwright test e2e/siwarga/fase-1-sisa.spec.ts`
Expected: PASS (3 tests). If a selector mismatches Task 6/7 markup, fix the spec (not the UI) unless the UI missed the mandated accessible names.

- [ ] **Step 3: Run the full verification**

```bash
composer test        # backend: config:clear + pint --test + phpstan + phpunit
npm run build        # frontend: tsc -b && vite build
npm run test         # frontend: vitest run
npx playwright test  # full e2e suite incl. the 20 pre-existing tests
```

Expected: all green. Commit the spec:

```bash
git add src/frontend/e2e/siwarga/fase-1-sisa.spec.ts
git commit -m "test: add Fase 1 sisa e2e (warga announcements, polls, forum)"
```
