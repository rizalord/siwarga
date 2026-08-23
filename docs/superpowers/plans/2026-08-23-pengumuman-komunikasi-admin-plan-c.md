# Plan C: Pengumuman & Komunikasi Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin side of the Pengumuman (Announcements) feature — full CRUD with per-house targeting, a Tiptap rich-text editor, category-based Bendahara restrictions, a "Publish" action that broadcasts to targeted (or all) residents via WhatsApp through the already-built `WahaService`/queue infrastructure — plus a small read-only Contact Messages inbox for the landing page's Kontak form submissions.

**Architecture:** Backend follows this codebase's existing Controller → Policy → Service pattern for `announcements`, but diverges from the flat `can:permission.name` route-middleware convention in one place: because the Bendahara role's `announcements.manage` permission is restricted to `category = 'keuangan'` at the *instance* level (not just a blanket yes/no), update/destroy/restore/publish authorize via `$this->authorize()` inside the controller (Laravel's standard policy auto-discovery: `App\Policies\AnnouncementPolicy` for `App\Models\Announcement`, zero extra registration needed) instead of `can:` route middleware, which can only express permission-name checks with no model awareness. `index`/`store` keep the familiar `can:announcements.view` / `can:announcements.manage` middleware since they don't need a model instance. Frontend follows the established `siwarga-*` feature-module pattern (`*-columns.tsx`/`*-table.tsx`/`*-provider.tsx`/`index.tsx`), reusing the shared `DataTable*` primitives from `src/components/data-table/`. `Announcement` targeting/trash/bulk-actions are deliberately scoped down from the full v1 CRUD convention (no bulk-delete/restore/trash-bin UI) to keep this plan tractable — see Global Constraints and the self-review notes for why.

**Tech Stack:** Laravel 13, PHPUnit, MySQL, React 19 + TanStack Query/Router, Tiptap (`@tiptap/react`, `@tiptap/starter-kit`) — new dependency, `mews/purifier` (already used by `HtmlSanitizer`), Laravel queues (`database` driver, already configured with a running `queue` worker service in `docker-compose.yml`).

**Spec:** `docs/superpowers/specs/2026-08-21-landing-announcements-design.md` (§3.2 permission table, §3.3 WAHA broadcast, §3.4 rich text sanitization, §4 `siwarga-announcements`/`siwarga-contact-messages` frontend modules). Also see `docs/superpowers/plans/2026-08-21-landing-announcements-plan-a-foundation.md` (built `Announcement`/`AnnouncementTarget`/`AnnouncementRead`/`ContactMessage` models, `WahaService`, `HtmlSanitizer`, queue worker infra — all consumed here) and `docs/superpowers/plans/2026-08-22-landing-announcements-plan-b-public-api-pages.md` (established the `pages.manage`-style permission/gate/policy pattern this plan extends).

## Global Constraints

- **`announcements.manage` is permission-gated AND category-gated for Bendahara** — per spec §3.2, Bendahara holds `announcements.manage` but may only create/update/delete/publish/restore announcements where `category = 'keuangan'`; Admin is unrestricted. This check lives in `AnnouncementPolicy`, never as a flat `Gate::define()` (the spec explicitly says "bukan gate generik").
- **`announcements.content` is sanitized server-side** via the existing `App\Services\HtmlSanitizer::sanitize()` before every create/update, exactly like `pages.content` in Plan B — this content renders unauthenticated on the public Astro blog once `is_public = true`.
- **WhatsApp sends are queued, never synchronous** — `POST /api/announcements/{announcement}/publish` dispatches `SendAnnouncementWhatsappJob` and returns immediately; the job itself must not let one resident's failed send abort the rest (catch-and-log per iteration, per spec §3.3).
- **No new HTTP client dependency** — WhatsApp sends go through the existing `WahaService`, already built and tested in Plan A.
- **Follow Pint formatting** (`vendor/bin/pint --dirty --format agent`) before each PHP commit.
- **Announcement CRUD is deliberately thin for this plan**: no bulk-delete/bulk-restore/bulk-force-delete endpoints or trash-bin UI (unlike `residents`/`houses`/`due-types`). `destroy` is a plain soft delete with no restore path exposed yet. This mirrors Plan B's precedent of scoping `pages` down to exactly what the spec's frontend section describes, and avoids a real authorization gap: per-row category-restricted bulk actions would need a much larger authorization subsystem (filtering bulk id-lists down to only the rows a Bendahara may touch) that the spec doesn't ask for. Full trash/bulk support can be a follow-up plan if it's later needed.
- **Frontend Tiptap dependency**: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link` added to `src/frontend/package.json`. This plan does **not** retrofit the existing `siwarga-pages` plain-`<textarea>` editor to use Tiptap — Plan B explicitly deferred that decision and it isn't part of this plan's scope; note it as a follow-up opportunity, don't do it silently.

---

### Task 1: `announcements.manage`/`announcements.view`/`announcements.trash`/`contact-messages.view` permissions, `AnnouncementPolicy`, `ContactMessagePolicy`, gates, `RoleSeeder`

**Files:**
- Modify: `app/Models/Permission.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Modify: `database/seeders/RoleSeeder.php`
- Create: `app/Policies/AnnouncementPolicy.php`
- Create: `app/Policies/ContactMessagePolicy.php`
- Test: `tests/Unit/AnnouncementPolicyTest.php`
- Test: `tests/Unit/ContactMessagePolicyTest.php`

**Interfaces:**
- Produces: `App\Policies\AnnouncementPolicy` with `viewAny(User): bool`, `view(User): bool`, `create(User): bool`, `update(User, Announcement): bool`, `delete(User, Announcement): bool`, `restore(User, Announcement): bool`, `publish(User, Announcement): bool`, and a public helper `canManageCategory(User, string $category): bool` — consumed directly (not via `can:` middleware) by Task 2's controller for `store`'s create-time category check and by Laravel's policy auto-discovery for `update`/`delete`/`restore`/`publish`.
- Produces: `App\Policies\ContactMessagePolicy` with `viewAny(User): bool`, `view(User): bool`, `update(User): bool` (marking read), consumed by Task 4's routes.
- Produces: `Gate::define('announcements.view', [AnnouncementPolicy::class, 'viewAny'])`, `Gate::define('announcements.manage', [AnnouncementPolicy::class, 'create'])` — consumed by Task 2's `index`/`store` route middleware. `update`/`delete`/`restore`/`publish` are deliberately **not** registered as named gates — Task 2's controller calls `$this->authorize('update', $announcement)` etc., which Laravel resolves via its built-in policy-class auto-discovery (`App\Models\Announcement` → `App\Policies\AnnouncementPolicy`), no `Gate::define()` needed for those.
- Produces: `Gate::define('contact-messages.view', [ContactMessagePolicy::class, 'viewAny'])`, consumed by Task 4's routes.
- Produces: permission rows `announcements.manage`, `announcements.view`, `announcements.trash`, `contact-messages.view` in `Permission::SYSTEM_PERMISSIONS`. `RoleSeeder` updated: Admin gets everything automatically (`Permission::all()`); Bendahara's list gains `announcements.manage`, `announcements.view`; Warga's list gains `announcements.view`.

- [ ] **Step 1: Write the failing policy tests**

```php
<?php

namespace Tests\Unit;

use App\Models\Announcement;
use App\Models\Role;
use App\Models\User;
use App\Policies\AnnouncementPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementPolicyTest extends TestCase
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

    public function test_admin_can_view_and_manage_any_category()
    {
        $admin = $this->actingUser('admin');
        $policy = new AnnouncementPolicy;

        $this->assertTrue($policy->viewAny($admin));
        $this->assertTrue($policy->create($admin));
        $this->assertTrue($policy->update($admin, Announcement::factory()->make(['category' => 'umum'])));
        $this->assertTrue($policy->delete($admin, Announcement::factory()->make(['category' => 'darurat'])));
    }

    public function test_bendahara_can_manage_only_keuangan_category()
    {
        $bendahara = $this->actingUser('bendahara');
        $policy = new AnnouncementPolicy;

        $this->assertTrue($policy->create($bendahara));
        $this->assertTrue($policy->update($bendahara, Announcement::factory()->make(['category' => 'keuangan'])));
        $this->assertFalse($policy->update($bendahara, Announcement::factory()->make(['category' => 'umum'])));
        $this->assertFalse($policy->delete($bendahara, Announcement::factory()->make(['category' => 'darurat'])));
        $this->assertTrue($policy->canManageCategory($bendahara, 'keuangan'));
        $this->assertFalse($policy->canManageCategory($bendahara, 'umum'));
    }

    public function test_warga_can_view_but_not_manage()
    {
        $warga = $this->actingUser('warga');
        $policy = new AnnouncementPolicy;

        $this->assertTrue($policy->viewAny($warga));
        $this->assertFalse($policy->create($warga));
        $this->assertFalse($policy->update($warga, Announcement::factory()->make(['category' => 'umum'])));
    }
}
```

```php
<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\User;
use App\Policies\ContactMessagePolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactMessagePolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_contact_messages()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $admin->load('roles.permissions');

        $this->assertTrue((new ContactMessagePolicy)->viewAny($admin));
    }

    public function test_warga_cannot_view_contact_messages()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $warga = User::factory()->create();
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');

        $this->assertFalse((new ContactMessagePolicy)->viewAny($warga));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Unit/AnnouncementPolicyTest.php tests/Unit/ContactMessagePolicyTest.php`
Expected: FAIL — classes `App\Policies\AnnouncementPolicy` and `App\Policies\ContactMessagePolicy` not found.

- [ ] **Step 3: Add the permissions**

In `app/Models/Permission.php`, add to `SYSTEM_PERMISSIONS` right after the `'pages.manage'` line:

```php
        'pages.manage' => 'Kelola halaman landing (Beranda, Profil Komplek, Kontak)',
        'announcements.manage' => 'Kelola pengumuman',
        'announcements.view' => 'Lihat pengumuman',
        'announcements.trash' => 'Kelola pengumuman terhapus',
        'contact-messages.view' => 'Lihat pesan kontak',
        'due-types.view' => 'Lihat jenis iuran',
```

- [ ] **Step 4: Write `AnnouncementPolicy`**

```php
<?php

namespace App\Policies;

use App\Models\Announcement;
use App\Models\Role;
use App\Models\User;

class AnnouncementPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('announcements.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('announcements.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('announcements.manage');
    }

    public function update(User $user, Announcement $announcement): bool
    {
        return $user->hasPermission('announcements.manage')
            && $this->canManageCategory($user, $announcement->category);
    }

    public function delete(User $user, Announcement $announcement): bool
    {
        return $user->hasPermission('announcements.manage')
            && $this->canManageCategory($user, $announcement->category);
    }

    public function restore(User $user, Announcement $announcement): bool
    {
        return $user->hasPermission('announcements.trash')
            && $this->canManageCategory($user, $announcement->category);
    }

    public function publish(User $user, Announcement $announcement): bool
    {
        return $user->hasPermission('announcements.manage')
            && $this->canManageCategory($user, $announcement->category);
    }

    /**
     * Admin may manage any category. Anyone else holding announcements.manage
     * (i.e. Bendahara, per RoleSeeder) may only manage the "keuangan" category.
     */
    public function canManageCategory(User $user, string $category): bool
    {
        if ($user->roles->contains('name', Role::ADMIN_ROLE_NAME)) {
            return true;
        }

        return $category === 'keuangan';
    }
}
```

- [ ] **Step 5: Write `ContactMessagePolicy`**

```php
<?php

namespace App\Policies;

use App\Models\User;

class ContactMessagePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('contact-messages.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('contact-messages.view');
    }

    public function update(User $user): bool
    {
        return $user->hasPermission('contact-messages.view');
    }
}
```

- [ ] **Step 6: Register the gates**

In `app/Providers/AppServiceProvider.php`, add imports `use App\Policies\AnnouncementPolicy;` and `use App\Policies\ContactMessagePolicy;`, then register in `registerGates()` right after the `pages.manage` line:

```php
        Gate::define('pages.manage', [PagePolicy::class, 'update']);

        // Announcements
        Gate::define('announcements.view', [AnnouncementPolicy::class, 'viewAny']);
        Gate::define('announcements.manage', [AnnouncementPolicy::class, 'create']);

        // Contact messages
        Gate::define('contact-messages.view', [ContactMessagePolicy::class, 'viewAny']);
```

- [ ] **Step 7: Update `RoleSeeder`**

In `database/seeders/RoleSeeder.php`, add `'announcements.manage', 'announcements.view',` to Bendahara's permission list and `'announcements.view',` to Warga's:

```php
        // Bendahara manages finance, but cannot change master data rumah/penghuni.
        $bendahara->permissions()->sync(Permission::whereIn('name', [
            'houses.view',
            'bills.view', 'bills.view.all', 'bills.generate', 'bills.trash',
            'payments.view', 'payments.view.all', 'payments.create', 'payments.trash',
            'expenses.view', 'expenses.create', 'expenses.edit', 'expenses.delete', 'expenses.trash',
            'expense-categories.view', 'expense-categories.manage', 'expense-categories.trash',
            'reports.view',
            'announcements.manage', 'announcements.view',
        ])->pluck('id'));

        // Warga can only view bills/payments within their own resident scope.
        $warga->permissions()->sync(Permission::whereIn('name', [
            'bills.view', 'bills.view.own', 'payments.view', 'payments.view.own',
            'announcements.view',
        ])->pluck('id'));
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `php artisan test --compact tests/Unit/AnnouncementPolicyTest.php tests/Unit/ContactMessagePolicyTest.php`
Expected: PASS (5 tests)

- [ ] **Step 9: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Models/Permission.php app/Providers/AppServiceProvider.php database/seeders/RoleSeeder.php app/Policies/AnnouncementPolicy.php app/Policies/ContactMessagePolicy.php tests/Unit/AnnouncementPolicyTest.php tests/Unit/ContactMessagePolicyTest.php
git commit -m "feat: add announcements/contact-messages permissions, policies, and gates"
```

---

### Task 2: Admin Announcement CRUD backend (resource, service, controller, routes, targeting)

**Files:**
- Create: `app/Http/Resources/AnnouncementResource.php`
- Create: `app/Services/AnnouncementService.php`
- Create: `app/Http/Controllers/Api/AnnouncementController.php`
- Modify: `routes/api.php`
- Modify: `app/Providers/AppServiceProvider.php` (register `Announcement` with `ActivityLogObserver`, matching every other admin-managed model)
- Test: `tests/Feature/Api/AnnouncementTest.php`

**Interfaces:**
- Consumes: `App\Models\Announcement`, `App\Models\AnnouncementTarget` (Plan A), `App\Services\HtmlSanitizer::sanitize()` (Plan A), `App\Policies\AnnouncementPolicy` (Task 1).
- Produces: `App\Http\Resources\AnnouncementResource` — `{id, title, slug, content, category, is_public, published_at, target_house_ids, created_by, created_at, updated_at, deleted_at}`.
- Produces: `App\Services\AnnouncementService::create(array $data, User $user): Announcement`, `::update(Announcement $announcement, array $data): Announcement`, `::delete(Announcement $announcement): void` — sanitizes `content`, auto-generates a unique `slug` from `title`, syncs `announcement_targets` from a `target_house_ids` array (absent/empty = no targeting = "broadcast to everyone" semantics, consumed by Task 3's job).
- Produces: routes `GET /api/announcements`, `POST /api/announcements`, `GET /api/announcements/{announcement}`, `PUT /api/announcements/{announcement}`, `DELETE /api/announcements/{announcement}` — consumed by Task 5's frontend service.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Announcement;
use App\Models\House;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $bendahara;

    protected User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $this->bendahara = User::factory()->create();
        $this->bendahara->roles()->attach(Role::where('name', 'bendahara')->first()->id);
        $this->bendahara->load('roles.permissions');

        $this->warga = User::factory()->create();
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    public function test_admin_can_list_announcements()
    {
        Announcement::factory()->count(3)->create();

        $response = $this->actingAs($this->admin)->getJson('/api/announcements');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_admin_can_create_announcement_with_targets()
    {
        $houses = House::factory()->count(2)->create();

        $response = $this->actingAs($this->admin)->postJson('/api/announcements', [
            'title' => 'Kerja Bakti Bulanan',
            'content' => '<p>Ayo gotong royong.</p>',
            'category' => 'kegiatan',
            'is_public' => true,
            'target_house_ids' => $houses->pluck('id')->all(),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Kerja Bakti Bulanan')
            ->assertJsonPath('data.slug', 'kerja-bakti-bulanan');
        $this->assertCount(2, $response->json('data.target_house_ids'));
        $this->assertDatabaseHas('announcements', ['title' => 'Kerja Bakti Bulanan', 'created_by' => $this->admin->id]);
    }

    public function test_creating_announcement_sanitizes_content()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/announcements', [
            'title' => 'Test',
            'content' => '<p>Halo</p><script>alert(1)</script>',
            'category' => 'umum',
        ]);

        $response->assertStatus(201);
        $this->assertStringNotContainsString('<script>', $response->json('data.content'));
    }

    public function test_duplicate_titles_get_unique_slugs()
    {
        $this->actingAs($this->admin)->postJson('/api/announcements', [
            'title' => 'Rapat RT', 'content' => '<p>A</p>', 'category' => 'umum',
        ]);
        $response = $this->actingAs($this->admin)->postJson('/api/announcements', [
            'title' => 'Rapat RT', 'content' => '<p>B</p>', 'category' => 'umum',
        ]);

        $response->assertJsonPath('data.slug', 'rapat-rt-2');
    }

    public function test_bendahara_can_create_keuangan_announcement()
    {
        $response = $this->actingAs($this->bendahara)->postJson('/api/announcements', [
            'title' => 'Laporan Keuangan', 'content' => '<p>A</p>', 'category' => 'keuangan',
        ]);

        $response->assertStatus(201);
    }

    public function test_bendahara_cannot_create_non_keuangan_announcement()
    {
        $response = $this->actingAs($this->bendahara)->postJson('/api/announcements', [
            'title' => 'Pengumuman Umum', 'content' => '<p>A</p>', 'category' => 'umum',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['category']);
    }

    public function test_bendahara_cannot_update_non_keuangan_announcement()
    {
        $announcement = Announcement::factory()->create(['category' => 'umum']);

        $response = $this->actingAs($this->bendahara)->putJson("/api/announcements/{$announcement->id}", [
            'title' => 'Diubah',
        ]);

        $response->assertStatus(403);
    }

    public function test_bendahara_cannot_move_keuangan_announcement_to_another_category()
    {
        $announcement = Announcement::factory()->create(['category' => 'keuangan']);

        $response = $this->actingAs($this->bendahara)->putJson("/api/announcements/{$announcement->id}", [
            'category' => 'umum',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['category']);
    }

    public function test_warga_cannot_create_announcement()
    {
        $response = $this->actingAs($this->warga)->postJson('/api/announcements', [
            'title' => 'Test', 'content' => '<p>A</p>', 'category' => 'umum',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_update_announcement()
    {
        $announcement = Announcement::factory()->create(['title' => 'Lama']);

        $response = $this->actingAs($this->admin)->putJson("/api/announcements/{$announcement->id}", [
            'title' => 'Baru',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.title', 'Baru');
    }

    public function test_admin_can_soft_delete_announcement()
    {
        $announcement = Announcement::factory()->create();

        $response = $this->actingAs($this->admin)->deleteJson("/api/announcements/{$announcement->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('announcements', ['id' => $announcement->id]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/AnnouncementTest.php`
Expected: FAIL — route `announcements.index` not found.

- [ ] **Step 3: Write the resource**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'content' => $this->content,
            'category' => $this->category,
            'is_public' => $this->is_public,
            'published_at' => $this->published_at,
            'target_house_ids' => $this->targets->pluck('house_id')->values(),
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
```

- [ ] **Step 4: Write the service**

```php
<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Support\Str;

class AnnouncementService
{
    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $user): Announcement
    {
        $data['content'] = $this->htmlSanitizer->sanitize($data['content']);
        $data['slug'] = $this->generateUniqueSlug($data['title']);
        $data['created_by'] = $user->id;

        $targetHouseIds = $data['target_house_ids'] ?? [];
        unset($data['target_house_ids']);

        $announcement = Announcement::create($data);
        $this->syncTargets($announcement, $targetHouseIds);

        return $announcement->fresh('targets');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Announcement $announcement, array $data): Announcement
    {
        if (array_key_exists('content', $data)) {
            $data['content'] = $data['content'] === null ? null : $this->htmlSanitizer->sanitize($data['content']);
        }

        if (array_key_exists('title', $data) && $data['title'] !== $announcement->title) {
            $data['slug'] = $this->generateUniqueSlug($data['title'], $announcement->id);
        }

        $targetHouseIds = null;
        if (array_key_exists('target_house_ids', $data)) {
            $targetHouseIds = $data['target_house_ids'];
            unset($data['target_house_ids']);
        }

        $announcement->update($data);

        if ($targetHouseIds !== null) {
            $this->syncTargets($announcement, $targetHouseIds);
        }

        return $announcement->fresh('targets');
    }

    public function delete(Announcement $announcement): void
    {
        $announcement->delete();
    }

    /**
     * @param  array<int, int>  $houseIds
     */
    private function syncTargets(Announcement $announcement, array $houseIds): void
    {
        $announcement->targets()->delete();

        foreach ($houseIds as $houseId) {
            $announcement->targets()->create(['house_id' => $houseId]);
        }
    }

    private function generateUniqueSlug(string $title, ?int $excludeId = null): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $suffix = 2;

        while (
            Announcement::withTrashed()
                ->where('slug', $slug)
                ->when($excludeId, fn ($query) => $query->where('id', '!=', $excludeId))
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
```

- [ ] **Step 5: Write the controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use App\Policies\AnnouncementPolicy;
use App\Services\AnnouncementService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AnnouncementController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private AnnouncementService $announcementService,
        private AnnouncementPolicy $announcementPolicy,
    ) {}

    public function index(Request $request)
    {
        $query = Announcement::query()->with('targets');

        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        $this->applySorting($query, $request, ['title', 'category', 'published_at', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), AnnouncementResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'content' => ['required', 'string'],
            'category' => ['required', 'in:darurat,umum,kegiatan,keuangan'],
            'is_public' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'target_house_ids' => ['sometimes', 'array'],
            'target_house_ids.*' => ['integer', 'exists:houses,id'],
        ]);

        $this->ensureCanManageCategory($request, $validated['category']);

        $announcement = $this->announcementService->create($validated, $request->user());

        return (new AnnouncementResource($announcement))->response()->setStatusCode(201);
    }

    public function show(Announcement $announcement)
    {
        $announcement->load('targets');

        return new AnnouncementResource($announcement);
    }

    public function update(Request $request, Announcement $announcement)
    {
        $this->authorize('update', $announcement);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'content' => ['sometimes', 'nullable', 'string'],
            'category' => ['sometimes', 'in:darurat,umum,kegiatan,keuangan'],
            'is_public' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'target_house_ids' => ['sometimes', 'array'],
            'target_house_ids.*' => ['integer', 'exists:houses,id'],
        ]);

        if (array_key_exists('category', $validated)) {
            $this->ensureCanManageCategory($request, $validated['category']);
        }

        $announcement = $this->announcementService->update($announcement, $validated);

        return new AnnouncementResource($announcement);
    }

    public function destroy(Request $request, Announcement $announcement)
    {
        $this->authorize('delete', $announcement);

        $this->announcementService->delete($announcement);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    /**
     * Blocks a Bendahara from creating/moving an announcement into a
     * category they aren't allowed to manage. Admin is never blocked.
     */
    private function ensureCanManageCategory(Request $request, string $category): void
    {
        if (! $this->announcementPolicy->canManageCategory($request->user(), $category)) {
            throw ValidationException::withMessages([
                'category' => ['Bendahara hanya dapat mengelola pengumuman kategori keuangan.'],
            ]);
        }
    }
}
```

- [ ] **Step 6: Add the routes**

In `routes/api.php`, add the import `use App\Http\Controllers\Api\AnnouncementController;` and add the routes inside the existing `auth:sanctum` group, after the `// Pages` block. Note `update`/`destroy` carry **no** `can:` middleware — authorization happens inside the controller via `$this->authorize()`, per this task's Interfaces section:

```php
    // Announcements
    Route::get('announcements', [AnnouncementController::class, 'index'])->middleware('can:announcements.view');
    Route::post('announcements', [AnnouncementController::class, 'store'])->middleware('can:announcements.manage');
    Route::get('announcements/{announcement}', [AnnouncementController::class, 'show'])->middleware('can:announcements.view');
    Route::put('announcements/{announcement}', [AnnouncementController::class, 'update']);
    Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy']);
```

- [ ] **Step 7: Register `Announcement` with the activity log observer**

In `app/Providers/AppServiceProvider.php`, add `Announcement::class` to the model list in `registerActivityLogObservers()`, and add `use App\Models\Announcement;` to the imports:

```php
        foreach ([Resident::class, House::class, DueType::class, Bill::class, Payment::class, Expense::class, ExpenseCategory::class, User::class, Role::class, Permission::class, Announcement::class] as $model) {
            $model::observe(ActivityLogObserver::class);
        }
```

- [ ] **Step 8: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/AnnouncementTest.php`
Expected: PASS (11 tests)

- [ ] **Step 9: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Resources/AnnouncementResource.php app/Services/AnnouncementService.php app/Http/Controllers/Api/AnnouncementController.php routes/api.php app/Providers/AppServiceProvider.php tests/Feature/Api/AnnouncementTest.php
git commit -m "feat: add admin announcement CRUD with targeting and category restrictions"
```

---

### Task 3: `SendAnnouncementWhatsappJob` + publish endpoint

**Files:**
- Create: `app/Jobs/SendAnnouncementWhatsappJob.php`
- Modify: `app/Http/Controllers/Api/AnnouncementController.php`
- Modify: `routes/api.php`
- Test: `tests/Unit/SendAnnouncementWhatsappJobTest.php`
- Test: `tests/Feature/Api/AnnouncementPublishTest.php`

**Interfaces:**
- Consumes: `App\Services\WahaService::sendMessage(string, string): bool` (Plan A), `App\Models\Announcement`, `App\Models\House::currentResident` relation, `App\Models\Resident::phone_number`.
- Produces: `App\Jobs\SendAnnouncementWhatsappJob implements ShouldQueue`, constructed with an `Announcement`. On `handle()`: resolves the target resident list (targeted houses' current residents if `announcement->targets()->exists()`, otherwise **all** residents with a non-null `phone_number` — "no targets" means "broadcast to everyone"), sends one WA message per resident via `WahaService`, catching and logging (not throwing) any per-resident failure, with a 1-second `sleep()` between sends.
- Produces: route `POST /api/announcements/{announcement}/publish` → `AnnouncementController::publish`, which sets `published_at` to now (if not already set) and dispatches the job. Consumed by Task 5's frontend `useMutation`.

- [ ] **Step 1: Write the failing job test**

```php
<?php

namespace Tests\Unit;

use App\Jobs\SendAnnouncementWhatsappJob;
use App\Models\Announcement;
use App\Models\House;
use App\Models\Resident;
use App\Services\WahaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class SendAnnouncementWhatsappJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_sends_to_all_residents_with_a_phone_number_when_no_targets()
    {
        Http::fake(['*/api/sendText' => Http::response(['id' => 'x'], 200)]);
        Resident::factory()->create(['phone_number' => '081111111111']);
        Resident::factory()->create(['phone_number' => '082222222222']);
        Resident::factory()->create(['phone_number' => null]);
        $announcement = Announcement::factory()->create(['title' => 'Info Penting']);

        (new SendAnnouncementWhatsappJob($announcement))->handle(app(WahaService::class));

        Http::assertSentCount(2);
    }

    public function test_sends_only_to_targeted_houses_current_residents()
    {
        Http::fake(['*/api/sendText' => Http::response(['id' => 'x'], 200)]);

        $targetedHouse = House::factory()->create();
        $targetedResident = Resident::factory()->create(['phone_number' => '081111111111']);
        $targetedHouse->residents()->attach($targetedResident->id, ['start_date' => now()->subMonth()]);

        $untargetedHouse = House::factory()->create();
        $untargetedResident = Resident::factory()->create(['phone_number' => '082222222222']);
        $untargetedHouse->residents()->attach($untargetedResident->id, ['start_date' => now()->subMonth()]);

        $announcement = Announcement::factory()->create();
        $announcement->targets()->create(['house_id' => $targetedHouse->id]);

        (new SendAnnouncementWhatsappJob($announcement))->handle(app(WahaService::class));

        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => $request['chatId'] === '6281111111111@c.us');
    }

    public function test_a_failed_send_does_not_abort_the_rest()
    {
        Log::spy();
        Http::fakeSequence()
            ->push(['error' => 'fail'], 500)
            ->push(['id' => 'ok'], 200);
        Resident::factory()->create(['phone_number' => '081111111111']);
        Resident::factory()->create(['phone_number' => '082222222222']);
        $announcement = Announcement::factory()->create();

        (new SendAnnouncementWhatsappJob($announcement))->handle(app(WahaService::class));

        Http::assertSentCount(2);
        Log::shouldHaveReceived('warning')->once();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/SendAnnouncementWhatsappJobTest.php`
Expected: FAIL — class `App\Jobs\SendAnnouncementWhatsappJob` not found.

- [ ] **Step 3: Write the job**

```php
<?php

namespace App\Jobs;

use App\Models\Announcement;
use App\Models\Resident;
use App\Services\WahaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendAnnouncementWhatsappJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public Announcement $announcement) {}

    public function handle(WahaService $wahaService): void
    {
        $residents = $this->resolveRecipients();
        $message = $this->buildMessage();

        foreach ($residents as $resident) {
            try {
                $sent = $wahaService->sendMessage($resident->phone_number, $message);

                if (! $sent) {
                    Log::warning('SendAnnouncementWhatsappJob: WAHA rejected the message', [
                        'announcement_id' => $this->announcement->id,
                        'resident_id' => $resident->id,
                    ]);
                }
            } catch (\Throwable $exception) {
                Log::warning('SendAnnouncementWhatsappJob: send failed', [
                    'announcement_id' => $this->announcement->id,
                    'resident_id' => $resident->id,
                    'error' => $exception->getMessage(),
                ]);
            }

            sleep(1);
        }
    }

    /**
     * @return \Illuminate\Support\Collection<int, Resident>
     */
    private function resolveRecipients()
    {
        if ($this->announcement->targets()->exists()) {
            $houseIds = $this->announcement->targets()->pluck('house_id')->filter();

            return Resident::query()
                ->whereHas('houses', fn ($query) => $query->whereIn('houses.id', $houseIds)->wherePivotNull('end_date'))
                ->whereNotNull('phone_number')
                ->get();
        }

        return Resident::query()->whereNotNull('phone_number')->get();
    }

    private function buildMessage(): string
    {
        $excerpt = trim(strip_tags($this->announcement->content));

        return "{$this->announcement->title}\n\n{$excerpt}";
    }
}
```

The job queries residents through a `houses()` relation on `Resident` rather than looping `House::currentResident` per targeted house — check `app/Models/Resident.php` for the inverse `belongsToMany(House::class, 'house_residents')` relation (built in v1) before writing this step; if the relation method has a different name than `houses()`, use the actual name and keep the `wherePivotNull('end_date')` filter for "current" residents only, matching `House::currentResident()`'s own filter.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact tests/Unit/SendAnnouncementWhatsappJobTest.php`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing publish-endpoint test**

```php
<?php

namespace Tests\Feature\Api;

use App\Jobs\SendAnnouncementWhatsappJob;
use App\Models\Announcement;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AnnouncementPublishTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_publish_announcement()
    {
        Queue::fake();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $admin->load('roles.permissions');
        $announcement = Announcement::factory()->create(['published_at' => null]);

        $response = $this->actingAs($admin)->postJson("/api/announcements/{$announcement->id}/publish");

        $response->assertStatus(200);
        Queue::assertPushed(SendAnnouncementWhatsappJob::class, fn ($job) => $job->announcement->is($announcement));
        $this->assertNotNull($announcement->fresh()->published_at);
    }

    public function test_bendahara_cannot_publish_non_keuangan_announcement()
    {
        Queue::fake();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $bendahara = User::factory()->create();
        $bendahara->roles()->attach(Role::where('name', 'bendahara')->first()->id);
        $bendahara->load('roles.permissions');
        $announcement = Announcement::factory()->create(['category' => 'umum']);

        $response = $this->actingAs($bendahara)->postJson("/api/announcements/{$announcement->id}/publish");

        $response->assertStatus(403);
        Queue::assertNotPushed(SendAnnouncementWhatsappJob::class);
    }
}
```

- [ ] **Step 6: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/AnnouncementPublishTest.php`
Expected: FAIL — route not found.

- [ ] **Step 7: Add the `publish` method**

In `app/Http/Controllers/Api/AnnouncementController.php`, add the import `use App\Jobs\SendAnnouncementWhatsappJob;` and add this method after `destroy`:

```php
    public function publish(Announcement $announcement)
    {
        $this->authorize('publish', $announcement);

        if ($announcement->published_at === null) {
            $announcement->update(['published_at' => now()]);
        }

        SendAnnouncementWhatsappJob::dispatch($announcement);

        return response()->json(['data' => null, 'message' => 'Pengumuman sedang dikirim ke WhatsApp warga']);
    }
```

- [ ] **Step 8: Add the route**

In `routes/api.php`, add after the `announcements/{announcement}` `destroy` route:

```php
    Route::post('announcements/{announcement}/publish', [AnnouncementController::class, 'publish']);
```

- [ ] **Step 9: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/AnnouncementPublishTest.php`
Expected: PASS (2 tests)

- [ ] **Step 10: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Jobs/SendAnnouncementWhatsappJob.php app/Http/Controllers/Api/AnnouncementController.php routes/api.php tests/Unit/SendAnnouncementWhatsappJobTest.php tests/Feature/Api/AnnouncementPublishTest.php
git commit -m "feat: add announcement publish action and WhatsApp broadcast job"
```

---

### Task 4: Admin Contact Messages inbox (index, show, mark-read)

**Files:**
- Create: `app/Http/Resources/ContactMessageResource.php`
- Create: `app/Http/Controllers/Api/ContactMessageAdminController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/ContactMessageAdminTest.php`

**Interfaces:**
- Consumes: `App\Models\ContactMessage` (Plan A), `App\Policies\ContactMessagePolicy` (Task 1).
- Produces: `App\Http\Resources\ContactMessageResource` — `{id, name, email, phone, message, status, created_at}`.
- Produces: routes `GET /api/contact-messages`, `GET /api/contact-messages/{contactMessage}`, `POST /api/contact-messages/{contactMessage}/mark-read` — consumed by Task 5's frontend service. Named `ContactMessageAdminController` (not `ContactMessageController`, which already exists from Plan B's public-facing `POST /public/contact` endpoint at `app/Http/Controllers/Api/ContactMessageController.php` — do not touch that file, this is a separate class for the admin-only read/mark-read side).

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\ContactMessage;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactMessageAdminTest extends TestCase
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

    public function test_admin_can_list_contact_messages()
    {
        ContactMessage::factory()->count(2)->create();

        $response = $this->actingAs($this->admin)->getJson('/api/contact-messages');

        $response->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_admin_can_view_a_contact_message()
    {
        $message = ContactMessage::factory()->create(['name' => 'Budi']);

        $response = $this->actingAs($this->admin)->getJson("/api/contact-messages/{$message->id}");

        $response->assertStatus(200)->assertJsonPath('data.name', 'Budi');
    }

    public function test_admin_can_mark_a_message_as_read()
    {
        $message = ContactMessage::factory()->create(['status' => 'new']);

        $response = $this->actingAs($this->admin)->postJson("/api/contact-messages/{$message->id}/mark-read");

        $response->assertStatus(200)->assertJsonPath('data.status', 'read');
        $this->assertDatabaseHas('contact_messages', ['id' => $message->id, 'status' => 'read']);
    }

    public function test_warga_cannot_list_contact_messages()
    {
        $response = $this->actingAs($this->warga)->getJson('/api/contact-messages');

        $response->assertStatus(403);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/ContactMessageAdminTest.php`
Expected: FAIL — route not found.

- [ ] **Step 3: Write the resource**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContactMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'message' => $this->message,
            'status' => $this->status,
            'created_at' => $this->created_at,
        ];
    }
}
```

- [ ] **Step 4: Write the controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContactMessageResource;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactMessageAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = ContactMessage::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $this->applySorting($query, $request, ['created_at'], 'created_at');

        return $this->paginated($query->paginate($request->per_page ?? 10), ContactMessageResource::class);
    }

    public function show(ContactMessage $contactMessage)
    {
        return new ContactMessageResource($contactMessage);
    }

    public function markRead(ContactMessage $contactMessage)
    {
        $contactMessage->update(['status' => 'read']);

        return new ContactMessageResource($contactMessage);
    }
}
```

- [ ] **Step 5: Add the routes**

In `routes/api.php`, add the import `use App\Http\Controllers\Api\ContactMessageAdminController;` and add the routes inside the `auth:sanctum` group, after the `// Announcements` block:

```php
    // Contact messages (admin)
    Route::get('contact-messages', [ContactMessageAdminController::class, 'index'])->middleware('can:contact-messages.view');
    Route::get('contact-messages/{contactMessage}', [ContactMessageAdminController::class, 'show'])->middleware('can:contact-messages.view');
    Route::post('contact-messages/{contactMessage}/mark-read', [ContactMessageAdminController::class, 'markRead'])->middleware('can:contact-messages.view');
```

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/ContactMessageAdminTest.php`
Expected: PASS (4 tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Resources/ContactMessageResource.php app/Http/Controllers/Api/ContactMessageAdminController.php routes/api.php tests/Feature/Api/ContactMessageAdminTest.php
git commit -m "feat: add admin contact messages inbox"
```

---

### Task 5: React admin — Announcement & ContactMessage types, services, hooks

**Files:**
- Modify: `src/frontend/src/types/api.ts`
- Create: `src/frontend/src/services/announcements.ts`
- Create: `src/frontend/src/hooks/use-announcements.ts`
- Create: `src/frontend/src/services/contact-messages.ts`
- Create: `src/frontend/src/hooks/use-contact-messages.ts`

**Interfaces:**
- Produces: TypeScript types `Announcement` (`{id, title, slug, content, category, is_public, published_at, target_house_ids, created_by, created_at, updated_at, deleted_at}`), `AnnouncementCategory` (`'darurat' | 'umum' | 'kegiatan' | 'keuangan'`), `CreateAnnouncementRequest`/`UpdateAnnouncementRequest`, `AnnouncementFilter`, `ContactMessage` (`{id, name, email, phone, message, status, created_at}`), `ContactMessageFilter`.
- Produces: `announcementsService.{getAll,getById,create,update,delete,publish}`, `contactMessagesService.{getAll,getById,markRead}`.
- Produces: `useAnnouncements(filter)`, `useAnnouncement(id)`, `useCreateAnnouncement()`, `useUpdateAnnouncement(id)`, `useDeleteAnnouncement()`, `usePublishAnnouncement()`, `useContactMessages(filter)`, `useContactMessage(id)`, `useMarkContactMessageRead()` — TanStack Query hooks, consumed by Tasks 7-9's UI.

- [ ] **Step 1: Add the types**

In `src/frontend/src/types/api.ts`, add after the `Page`/`UpdatePageRequest` block (added in Plan B):

```typescript
export type AnnouncementCategory = 'darurat' | 'umum' | 'kegiatan' | 'keuangan'

export interface Announcement {
  id: number
  title: string
  slug: string | null
  content: string
  category: AnnouncementCategory
  is_public: boolean
  published_at: string | null
  target_house_ids: number[]
  created_by: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateAnnouncementRequest {
  title: string
  content: string
  category: AnnouncementCategory
  is_public?: boolean
  published_at?: string | null
  target_house_ids?: number[]
}

export interface UpdateAnnouncementRequest {
  title?: string
  content?: string
  category?: AnnouncementCategory
  is_public?: boolean
  published_at?: string | null
  target_house_ids?: number[]
}

export interface AnnouncementFilter {
  search?: string
  category?: AnnouncementCategory
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface ContactMessage {
  id: number
  name: string
  email: string | null
  phone: string | null
  message: string
  status: 'new' | 'read'
  created_at: string
}

export interface ContactMessageFilter {
  status?: 'new' | 'read'
  page?: number
  per_page?: number
}
```

- [ ] **Step 2: Write the announcements service**

```typescript
import type {
  ApiResponse,
  PaginatedResponse,
  Announcement,
  AnnouncementFilter,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '@/types/api'
import api from './api'

export const announcementsService = {
  getAll: (params?: AnnouncementFilter) =>
    api.get<PaginatedResponse<Announcement>>('/api/announcements', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<Announcement>>(`/api/announcements/${id}`),
  create: (data: CreateAnnouncementRequest) =>
    api.post<ApiResponse<Announcement>>('/api/announcements', data),
  update: (id: number, data: UpdateAnnouncementRequest) =>
    api.put<ApiResponse<Announcement>>(`/api/announcements/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/api/announcements/${id}`),
  publish: (id: number) =>
    api.post<ApiResponse<null>>(`/api/announcements/${id}/publish`),
}
```

- [ ] **Step 3: Write the announcements hooks**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementsService } from '@/services/announcements'
import type {
  AnnouncementFilter,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '@/types/api'
import { toast } from 'sonner'

export function useAnnouncements(params?: AnnouncementFilter) {
  return useQuery({
    queryKey: ['announcements', params],
    queryFn: () => announcementsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useAnnouncement(id: number) {
  return useQuery({
    queryKey: ['announcements', id],
    queryFn: () => announcementsService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAnnouncementRequest) => announcementsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Pengumuman berhasil ditambahkan')
    },
  })
}

export function useUpdateAnnouncement(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateAnnouncementRequest) => announcementsService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Pengumuman berhasil diperbarui')
    },
  })
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => announcementsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Pengumuman berhasil dihapus')
    },
  })
}

export function usePublishAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => announcementsService.publish(id),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['announcements'] })
      toast.success(response.data.message ?? 'Pengumuman sedang dikirim')
    },
  })
}
```

- [ ] **Step 4: Write the contact-messages service and hooks**

```typescript
import type {
  ApiResponse,
  PaginatedResponse,
  ContactMessage,
  ContactMessageFilter,
} from '@/types/api'
import api from './api'

export const contactMessagesService = {
  getAll: (params?: ContactMessageFilter) =>
    api.get<PaginatedResponse<ContactMessage>>('/api/contact-messages', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<ContactMessage>>(`/api/contact-messages/${id}`),
  markRead: (id: number) =>
    api.post<ApiResponse<ContactMessage>>(`/api/contact-messages/${id}/mark-read`),
}
```

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactMessagesService } from '@/services/contact-messages'
import type { ContactMessageFilter } from '@/types/api'
import { toast } from 'sonner'

export function useContactMessages(params?: ContactMessageFilter) {
  return useQuery({
    queryKey: ['contact-messages', params],
    queryFn: () => contactMessagesService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useContactMessage(id: number) {
  return useQuery({
    queryKey: ['contact-messages', id],
    queryFn: () => contactMessagesService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useMarkContactMessageRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => contactMessagesService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-messages'] })
    },
  })
}
```

- [ ] **Step 5: Verify with the type checker**

Run: `npm run build`
Expected: `tsc -b` passes with no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/api.ts src/services/announcements.ts src/hooks/use-announcements.ts src/services/contact-messages.ts src/hooks/use-contact-messages.ts
git commit -m "feat: add announcement and contact-message types, services, and hooks"
```

---

### Task 6: React admin — Tiptap dependency + shared `RichTextEditor` component

**Files:**
- Modify: `src/frontend/package.json`
- Create: `src/frontend/src/components/rich-text-editor.tsx`

**Interfaces:**
- Produces: `<RichTextEditor value={string} onChange={(html: string) => void} placeholder?={string} />`, a controlled component wrapping Tiptap's `useEditor`/`EditorContent`, rendering a toolbar (bold, italic, headings H2/H3, bullet/ordered list, link, blockquote) matching the tag allowlist already enforced server-side by `HtmlSanitizer` (`p,br,strong,em,a[href],h1,h2,h3,h4,ul,ol,li,img[src|alt],blockquote`) — consumed by Task 8's announcement form.

- [ ] **Step 1: Add the dependencies**

```bash
cd src/frontend
npm install @tiptap/react@^2 @tiptap/starter-kit@^2 @tiptap/extension-link@^2
```

- [ ] **Step 2: Write the component**

```tsx
import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  LinkIcon,
} from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[180px] rounded-md border border-input bg-transparent px-3 py-2 focus:outline-none',
        'data-placeholder': placeholder ?? '',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!editor) return null

  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap gap-1 rounded-md border border-input p-1'>
        <Toggle
          size='sm'
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className='h-4 w-4' />
        </Toggle>
        <Toggle
          size='sm'
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className='h-4 w-4' />
        </Toggle>
        <Toggle
          size='sm'
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className='h-4 w-4' />
        </Toggle>
        <Toggle
          size='sm'
          pressed={editor.isActive('heading', { level: 3 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className='h-4 w-4' />
        </Toggle>
        <Toggle
          size='sm'
          pressed={editor.isActive('bulletList')}
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
        >
          <List className='h-4 w-4' />
        </Toggle>
        <Toggle
          size='sm'
          pressed={editor.isActive('orderedList')}
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
        >
          <ListOrdered className='h-4 w-4' />
        </Toggle>
        <Toggle
          size='sm'
          pressed={editor.isActive('blockquote')}
          onPressedChange={() =>
            editor.chain().focus().toggleBlockquote().run()
          }
        >
          <Quote className='h-4 w-4' />
        </Toggle>
        <Toggle
          size='sm'
          pressed={editor.isActive('link')}
          onPressedChange={() => {
            const url = window.prompt('URL tautan')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            } else {
              editor.chain().focus().unsetLink().run()
            }
          }}
        >
          <LinkIcon className='h-4 w-4' />
        </Toggle>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
```

Check `src/frontend/src/components/ui/toggle.tsx` exists before using it (it's part of the shadcn-admin template's standard component set); if it doesn't exist yet, run the project's usual shadcn component-add flow for `toggle` first (check `README.md`/`CLAUDE.md` for the exact command, e.g. `npx shadcn@latest add toggle`) rather than hand-rolling one.

- [ ] **Step 3: Verify with the type checker**

Run: `npm run build`
Expected: `tsc -b` passes with no new errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/rich-text-editor.tsx
git commit -m "feat: add Tiptap dependency and shared RichTextEditor component"
```

---

### Task 7: React admin — `siwarga-announcements` table (columns, table, list page)

**Files:**
- Create: `src/frontend/src/features/siwarga-announcements/announcements-columns.tsx`
- Create: `src/frontend/src/features/siwarga-announcements/announcements-table.tsx`
- Create: `src/frontend/src/features/siwarga-announcements/index.tsx`
- Create: `src/frontend/src/routes/_authenticated/announcements/index.tsx`
- Modify: `src/frontend/src/components/layout/data/sidebar-data.ts`

**Interfaces:**
- Consumes: `useAnnouncements`, `useDeleteAnnouncement`, `usePublishAnnouncement` (Task 5).
- Produces: route `/announcements`, page component `AnnouncementsPage`. Table has no restore/force-delete/bulk actions (per Global Constraints — this plan's CRUD is soft-delete-only with no trash-bin UI), so it's a simpler table than `siwarga-due-types`': search + category filter, row actions (Ubah/Hapus/Publish), no row-selection/bulk-actions bar.

- [ ] **Step 1: Write the columns**

```tsx
import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import type { Announcement } from '@/types/api'
import { Send, Trash2, UserPen } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/data-table'

const EMPTY_PERMISSIONS: string[] = []

const CATEGORY_LABELS: Record<Announcement['category'], string> = {
  darurat: 'Darurat',
  umum: 'Umum',
  kegiatan: 'Kegiatan',
  keuangan: 'Keuangan',
}

type AnnouncementsColumnsProps = {
  setOpen: (open: 'create' | 'update' | 'delete' | 'publish' | null) => void
  setCurrentRow: (row: Announcement | null) => void
}

export function announcementsColumns({
  setOpen,
  setCurrentRow,
}: AnnouncementsColumnsProps): ColumnDef<Announcement>[] {
  function DataTableRowActions({ row }: { row: Row<Announcement> }) {
    const permissions = useAuthStore(
      (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS
    )
    const canManage = permissions.includes('announcements.manage')

    if (!canManage) return null

    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
          >
            <DotsHorizontalIcon className='h-4 w-4' />
            <span className='sr-only'>Buka menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-44'>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('update')
            }}
          >
            Ubah
            <DropdownMenuShortcut>
              <UserPen size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('publish')
            }}
          >
            Kirim ke WhatsApp
            <DropdownMenuShortcut>
              <Send size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('delete')
            }}
            className='text-red-500!'
          >
            Hapus
            <DropdownMenuShortcut>
              <Trash2 size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return [
    {
      id: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Judul' />
      ),
      accessorKey: 'title',
      meta: { label: 'Judul' },
    },
    {
      id: 'category',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Kategori' />
      ),
      accessorKey: 'category',
      cell: ({ row }) => (
        <Badge variant='secondary'>
          {CATEGORY_LABELS[row.original.category]}
        </Badge>
      ),
      meta: { label: 'Kategori' },
    },
    {
      id: 'is_public',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Publik' />
      ),
      accessorKey: 'is_public',
      cell: ({ row }) => (
        <Badge variant={row.original.is_public ? 'default' : 'outline'}>
          {row.original.is_public ? 'Ya' : 'Tidak'}
        </Badge>
      ),
      meta: { label: 'Publik' },
    },
    {
      id: 'published_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Diterbitkan' />
      ),
      accessorKey: 'published_at',
      cell: ({ row }) =>
        row.original.published_at
          ? new Date(row.original.published_at).toLocaleDateString('id-ID')
          : '-',
      meta: { label: 'Diterbitkan' },
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
      enableSorting: false,
    },
  ]
}
```

- [ ] **Step 2: Write the table**

```tsx
import { useEffect, useState } from 'react'
import {
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { Announcement } from '@/types/api'
import { cn } from '@/lib/utils'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { announcementsColumns as columns } from './announcements-columns'

type DataTableProps = {
  data: Announcement[]
  pageCount: number
  isFetching?: boolean
  search: Record<string, unknown>
  navigate: NavigateFn
  setOpen: (open: 'create' | 'update' | 'delete' | 'publish' | null) => void
  setCurrentRow: (row: Announcement | null) => void
}

export function AnnouncementsTable({
  data,
  pageCount,
  isFetching,
  search,
  navigate,
  setOpen,
  setCurrentRow,
}: DataTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const {
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: true, key: 'search' },
    sorting: {},
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: columns({ setOpen, setCurrentRow }),
    state: {
      columnVisibility,
      columnFilters,
      globalFilter,
      pagination,
      sorting,
    },
    pageCount,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    getRowId: (row) => String(row.id),
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange,
    onGlobalFilterChange,
    onColumnFiltersChange,
    onSortingChange,
  })

  useEffect(() => {
    ensurePageInRange(pageCount)
  }, [pageCount, ensurePageInRange])

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <DataTableToolbar table={table} searchPlaceholder='Cari pengumuman...' />
      <div className='min-h-0 flex-1 overflow-auto'>
        <div
          className={cn(
            'overflow-hidden rounded-md border transition-opacity',
            isFetching && 'opacity-60'
          )}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns({ setOpen, setCurrentRow }).length}
                    className='h-24 text-center'
                  >
                    Tidak ada data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
    </div>
  )
}
```

- [ ] **Step 3: Write the route**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { AnnouncementsPage } from '@/features/siwarga-announcements'

export const Route = createFileRoute('/_authenticated/announcements/')({
  component: AnnouncementsPage,
})
```

- [ ] **Step 4: Add the sidebar entry**

In `src/frontend/src/components/layout/data/sidebar-data.ts`, add a new nav group after `Data Master` (before `Keuangan`), and import `Megaphone`, `Mail` from `lucide-react`:

```typescript
import {
  LayoutDashboard,
  Users,
  Home,
  Receipt,
  Wallet,
  ShoppingCart,
  Tag,
  FileText,
  Megaphone,
  Mail,
  UserCog,
  Banknote,
  ShieldCheck,
  KeyRound,
  History,
} from 'lucide-react'
```

```typescript
    {
      title: 'Komunikasi',
      items: [
        {
          title: 'Pengumuman',
          url: '/announcements',
          icon: Megaphone,
          permission: 'announcements.view',
        },
        {
          title: 'Pesan Kontak',
          url: '/contact-messages',
          icon: Mail,
          permission: 'contact-messages.view',
        },
      ],
    },
```

`index.tsx` (the page component itself, wired to Task 8's form/dialogs) is written in Task 8, since it depends on the dialog components that task builds — this task ends with the table/columns/route/sidebar entry only. Skip Step 5's build check until Task 8 completes `index.tsx`; running `npm run build` now will fail on the missing `AnnouncementsPage` export, which is expected and not a defect in this task — note it in the report rather than trying to work around it.

- [ ] **Step 5: Commit**

```bash
git add src/features/siwarga-announcements/announcements-columns.tsx src/features/siwarga-announcements/announcements-table.tsx src/routes/_authenticated/announcements src/components/layout/data/sidebar-data.ts
git commit -m "feat: add siwarga-announcements table and columns"
```

---

### Task 8: React admin — `siwarga-announcements` form, dialogs, and page (Tiptap + targeting + publish)

**Files:**
- Create: `src/frontend/src/features/siwarga-announcements/announcement-form.tsx`
- Create: `src/frontend/src/features/siwarga-announcements/house-target-picker.tsx`
- Create: `src/frontend/src/features/siwarga-announcements/index.tsx`

**Interfaces:**
- Consumes: `useCreateAnnouncement`, `useUpdateAnnouncement`, `useDeleteAnnouncement`, `usePublishAnnouncement` (Task 5), `RichTextEditor` (Task 6), `AnnouncementsTable`/`announcementsColumns` (Task 7), `useHouses` (existing, `src/hooks/use-houses.ts`).
- Produces: `AnnouncementFormDialog`, `HouseTargetPicker` (a checkbox list of houses filtered by a debounced search, used inside the form for `target_house_ids`), `AnnouncementsPage` — completes the route from Task 7.

- [ ] **Step 1: Write the house target picker**

```tsx
import { useState } from 'react'
import { useHouses } from '@/hooks/use-houses'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

type HouseTargetPickerProps = {
  value: number[]
  onChange: (houseIds: number[]) => void
}

export function HouseTargetPicker({ value, onChange }: HouseTargetPickerProps) {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useHouses({ search, per_page: 50 })

  const toggle = (houseId: number) => {
    onChange(
      value.includes(houseId)
        ? value.filter((id) => id !== houseId)
        : [...value, houseId]
    )
  }

  return (
    <div className='space-y-2'>
      <Input
        placeholder='Cari nomor rumah...'
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <ScrollArea className='h-40 rounded-md border p-2'>
        {isLoading && (
          <p className='text-muted-foreground text-sm'>Memuat...</p>
        )}
        {!isLoading && data?.data.length === 0 && (
          <p className='text-muted-foreground text-sm'>Tidak ada rumah ditemukan.</p>
        )}
        {data?.data.map((house) => (
          <label
            key={house.id}
            className='flex items-center gap-2 py-1 text-sm'
          >
            <Checkbox
              checked={value.includes(house.id)}
              onCheckedChange={() => toggle(house.id)}
            />
            {house.house_number}
          </label>
        ))}
      </ScrollArea>
      <p className='text-muted-foreground text-xs'>
        {value.length === 0
          ? 'Tidak ada rumah dipilih — pengumuman akan dikirim ke semua warga saat diterbitkan.'
          : `${value.length} rumah dipilih.`}
      </p>
    </div>
  )
}
```

Check `src/frontend/src/components/ui/scroll-area.tsx` and `checkbox.tsx` exist before using them (standard shadcn-admin template components); add via the project's shadcn component-add flow first if either is missing.

- [ ] **Step 2: Write the form dialog**

```tsx
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Announcement } from '@/types/api'
import { useCreateAnnouncement, useUpdateAnnouncement } from '@/hooks/use-announcements'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RichTextEditor } from '@/components/rich-text-editor'
import { HouseTargetPicker } from './house-target-picker'

type AnnouncementFormDialogProps = {
  currentRow?: Announcement
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi.'),
  content: z.string().min(1, 'Konten wajib diisi.'),
  category: z.enum(['darurat', 'umum', 'kegiatan', 'keuangan'], {
    error: 'Kategori wajib dipilih.',
  }),
  is_public: z.boolean(),
  target_house_ids: z.array(z.number()),
})

type AnnouncementFormValues = z.infer<typeof formSchema>

const CATEGORY_OPTIONS = [
  { value: 'darurat', label: 'Darurat' },
  { value: 'umum', label: 'Umum' },
  { value: 'kegiatan', label: 'Kegiatan' },
  { value: 'keuangan', label: 'Keuangan' },
] as const

export function AnnouncementFormDialog({
  currentRow,
  open,
  onOpenChange,
}: AnnouncementFormDialogProps) {
  const isUpdate = !!currentRow
  const createAnnouncement = useCreateAnnouncement()
  const updateAnnouncement = useUpdateAnnouncement(currentRow?.id ?? 0)

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow
      ? {
          title: currentRow.title,
          content: currentRow.content,
          category: currentRow.category,
          is_public: currentRow.is_public,
          target_house_ids: currentRow.target_house_ids,
        }
      : {
          title: '',
          content: '',
          category: 'umum',
          is_public: false,
          target_house_ids: [],
        },
  })

  const onSubmit = (data: AnnouncementFormValues) => {
    if (isUpdate && currentRow) {
      updateAnnouncement.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    } else {
      createAnnouncement.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    }
  }

  const isPending = createAnnouncement.isPending || updateAnnouncement.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isUpdate ? 'Ubah Pengumuman' : 'Tambah Pengumuman'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Perbarui pengumuman di sini. Klik simpan setelah selesai.'
              : 'Tambahkan pengumuman baru. Klik simpan setelah selesai.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='announcement-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul *</FormLabel>
                  <FormControl>
                    <Input placeholder='Judul pengumuman' autoComplete='off' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='category'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Pilih kategori' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='content'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konten *</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder='Tulis isi pengumuman...'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='is_public'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center gap-2 space-y-0'>
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className='font-normal'>
                    Tampilkan di blog landing page
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='target_house_ids'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Rumah</FormLabel>
                  <FormControl>
                    <HouseTargetPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='announcement-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Write the page**

```tsx
import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { Announcement } from '@/types/api'
import { Plus, AlertTriangle, Send } from 'lucide-react'
import {
  useAnnouncements,
  useDeleteAnnouncement,
  usePublishAnnouncement,
} from '@/hooks/use-announcements'
import useDialogState from '@/hooks/use-dialog-state'
import { useHasPermission } from '@/hooks/use-permission'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { AnnouncementFormDialog } from './announcement-form'
import { AnnouncementsTable } from './announcements-table'

const route = getRouteApi('/_authenticated/announcements/')

function AnnouncementsDialogs({
  open,
  setOpen,
  currentRow,
  setCurrentRow,
}: {
  open: 'create' | 'update' | 'delete' | 'publish' | null
  setOpen: (open: 'create' | 'update' | 'delete' | 'publish' | null) => void
  currentRow: Announcement | null
  setCurrentRow: (row: Announcement | null) => void
}) {
  const deleteAnnouncement = useDeleteAnnouncement()
  const publishAnnouncement = usePublishAnnouncement()

  const handleDelete = () => {
    if (!currentRow) return
    deleteAnnouncement.mutate(currentRow.id, {
      onSuccess: () => {
        setOpen(null)
        setTimeout(() => setCurrentRow(null), 500)
      },
    })
  }

  const handlePublish = () => {
    if (!currentRow) return
    publishAnnouncement.mutate(currentRow.id, {
      onSuccess: () => {
        setOpen(null)
        setTimeout(() => setCurrentRow(null), 500)
      },
    })
  }

  return (
    <>
      <AnnouncementFormDialog
        key='announcement-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      {currentRow && (
        <>
          <AnnouncementFormDialog
            key={`announcement-update-${currentRow.id}`}
            open={open === 'update'}
            onOpenChange={() => {
              setOpen('update')
              setTimeout(() => setCurrentRow(null), 500)
            }}
            currentRow={currentRow}
          />

          <ConfirmDialog
            key={`announcement-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => setCurrentRow(null), 500)
            }}
            handleConfirm={handleDelete}
            disabled={deleteAnnouncement.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Pengumuman
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus{' '}
                <span className='font-bold'>{currentRow.title}</span>?
              </p>
            }
            confirmText='Hapus'
            destructive
          />

          <ConfirmDialog
            key={`announcement-publish-${currentRow.id}`}
            open={open === 'publish'}
            onOpenChange={() => {
              setOpen('publish')
              setTimeout(() => setCurrentRow(null), 500)
            }}
            handleConfirm={handlePublish}
            disabled={publishAnnouncement.isPending}
            isLoading={publishAnnouncement.isPending}
            title={
              <span className='flex items-center gap-1'>
                <Send size={18} /> Kirim ke WhatsApp
              </span>
            }
            desc={
              <p>
                Kirim <span className='font-bold'>{currentRow.title}</span> ke
                WhatsApp warga
                {currentRow.target_house_ids.length > 0
                  ? ` di ${currentRow.target_house_ids.length} rumah terpilih`
                  : ' — semua warga (tidak ada rumah target yang dipilih)'}
                ?
              </p>
            }
            confirmText='Kirim'
          />
        </>
      )}
    </>
  )
}

function AnnouncementsPageInner() {
  const canManage = useHasPermission('announcements.manage')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useAnnouncements({
    page: search.page,
    per_page: search.pageSize,
    search: search.search,
  })

  const [open, setOpen] = useDialogState<
    'create' | 'update' | 'delete' | 'publish'
  >(null)
  const [currentRow, setCurrentRow] = useState<Announcement | null>(null)

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Pengumuman</h2>
            <p className='text-muted-foreground'>
              Kelola pengumuman warga dan kirim notifikasi WhatsApp.
            </p>
          </div>
          {canManage && (
            <Button className='space-x-1' onClick={() => setOpen('create')}>
              <span>Tambah Pengumuman</span> <Plus size={18} />
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <AnnouncementsTable
            data={data?.data ?? []}
            pageCount={data?.last_page ?? 1}
            isFetching={isFetching}
            search={search}
            navigate={navigate}
            setOpen={setOpen}
            setCurrentRow={setCurrentRow}
          />
        )}
      </Main>

      <AnnouncementsDialogs
        open={open}
        setOpen={setOpen}
        currentRow={currentRow}
        setCurrentRow={setCurrentRow}
      />
    </>
  )
}

export function AnnouncementsPage() {
  return <AnnouncementsPageInner />
}
```

- [ ] **Step 4: Regenerate the route tree and verify the build**

Run: `npm run dev` briefly (to trigger TanStack Router's Vite-plugin regeneration of `routeTree.gen.ts`) then stop it, or use the project's dedicated route-generation script if `package.json` exposes one.
Run: `npm run build`
Expected: build succeeds, `/announcements` resolves with no TypeScript errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev` with the backend running and seeded, log in as `admin@siwarga.test`, navigate to `/announcements`, create an announcement with a category, some rich-text content, and two target houses, confirm it appears in the table, then edit it, then trigger "Kirim ke WhatsApp" and confirm the toast confirms the send was queued (WAHA itself doesn't need to be running for this check — the queue worker will just log failures if it can't reach WAHA, per Task 3's per-iteration catch).

- [ ] **Step 6: Commit**

```bash
git add src/features/siwarga-announcements/announcement-form.tsx src/features/siwarga-announcements/house-target-picker.tsx src/features/siwarga-announcements/index.tsx src/routeTree.gen.ts
git commit -m "feat: add siwarga-announcements form, targeting, and publish UI"
```

---

### Task 9: React admin — `siwarga-contact-messages` inbox

**Files:**
- Create: `src/frontend/src/features/siwarga-contact-messages/contact-messages-columns.tsx`
- Create: `src/frontend/src/features/siwarga-contact-messages/contact-message-detail.tsx`
- Create: `src/frontend/src/features/siwarga-contact-messages/index.tsx`
- Create: `src/frontend/src/routes/_authenticated/contact-messages/index.tsx`

**Interfaces:**
- Consumes: `useContactMessages`, `useMarkContactMessageRead` (Task 5).
- Produces: route `/contact-messages`, page component `ContactMessagesPage` — a simple table (no create/edit/delete, matching the backend's read+mark-read-only scope from Task 4) with a detail sheet that marks a message read when opened.

- [ ] **Step 1: Write the columns**

```tsx
import type { ColumnDef } from '@tanstack/react-table'
import type { ContactMessage } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'

type ContactMessagesColumnsProps = {
  onSelect: (row: ContactMessage) => void
}

export function contactMessagesColumns({
  onSelect,
}: ContactMessagesColumnsProps): ColumnDef<ContactMessage>[] {
  return [
    {
      id: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'new' ? 'default' : 'outline'}>
          {row.original.status === 'new' ? 'Baru' : 'Dibaca'}
        </Badge>
      ),
      meta: { label: 'Status' },
    },
    {
      id: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama' />
      ),
      accessorKey: 'name',
      cell: ({ row }) => (
        <button
          type='button'
          className='text-start hover:underline'
          onClick={() => onSelect(row.original)}
        >
          {row.original.name}
        </button>
      ),
      meta: { label: 'Nama' },
    },
    {
      id: 'message',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Pesan' />
      ),
      accessorKey: 'message',
      cell: ({ row }) => (
        <span className='block max-w-md truncate'>{row.original.message}</span>
      ),
      meta: { label: 'Pesan' },
    },
    {
      id: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Waktu' />
      ),
      accessorKey: 'created_at',
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleString('id-ID'),
      meta: { label: 'Waktu' },
    },
  ]
}
```

- [ ] **Step 2: Write the detail sheet**

```tsx
import type { ContactMessage } from '@/types/api'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type ContactMessageDetailProps = {
  message: ContactMessage | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactMessageDetail({
  message,
  open,
  onOpenChange,
}: ContactMessageDetailProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='space-y-4'>
        <SheetHeader>
          <SheetTitle>{message?.name}</SheetTitle>
          <SheetDescription>
            {message
              ? new Date(message.created_at).toLocaleString('id-ID')
              : ''}
          </SheetDescription>
        </SheetHeader>
        {message && (
          <div className='space-y-3 px-4 text-sm'>
            {message.email && (
              <p>
                <span className='font-medium'>Email:</span> {message.email}
              </p>
            )}
            {message.phone && (
              <p>
                <span className='font-medium'>Telepon:</span> {message.phone}
              </p>
            )}
            <p className='whitespace-pre-wrap'>{message.message}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: Write the page**

```tsx
import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { ContactMessage } from '@/types/api'
import {
  useContactMessages,
  useMarkContactMessageRead,
} from '@/hooks/use-contact-messages'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ContactMessageDetail } from './contact-message-detail'
import { contactMessagesColumns as columns } from './contact-messages-columns'

const route = getRouteApi('/_authenticated/contact-messages/')

function ContactMessagesPageInner() {
  const search = route.useSearch()
  const { data, isLoading } = useContactMessages({
    page: search.page as number | undefined,
  })
  const markRead = useMarkContactMessageRead()

  const [selected, setSelected] = useState<ContactMessage | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const handleSelect = (message: ContactMessage) => {
    setSelected(message)
    setDetailOpen(true)
    if (message.status === 'new') {
      markRead.mutate(message.id)
    }
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.data ?? [],
    columns: columns({ onSelect: handleSelect }),
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Pesan Kontak</h2>
          <p className='text-muted-foreground'>
            Pesan masuk dari formulir kontak di landing page.
          </p>
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <div className='overflow-hidden rounded-md border'>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className='h-24 text-center'>
                      Tidak ada pesan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Main>

      <ContactMessageDetail
        message={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}

export function ContactMessagesPage() {
  return <ContactMessagesPageInner />
}
```

- [ ] **Step 4: Write the route**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ContactMessagesPage } from '@/features/siwarga-contact-messages'

export const Route = createFileRoute('/_authenticated/contact-messages/')({
  component: ContactMessagesPage,
})
```

- [ ] **Step 5: Regenerate the route tree and verify the build**

Run: `npm run dev` briefly then stop it (or the project's route-generation script), then `npm run build`.
Expected: build succeeds, `/contact-messages` resolves with no TypeScript errors.

- [ ] **Step 6: Manual verification**

With the backend running and seeded, submit the Astro landing app's Kontak form (or `POST /api/public/contact` directly), then log in as `admin@siwarga.test`, navigate to `/contact-messages`, confirm the new message shows a "Baru" badge, click it, confirm the detail sheet opens and the badge flips to "Dibaca" after a refresh.

- [ ] **Step 7: Commit**

```bash
git add src/features/siwarga-contact-messages src/routes/_authenticated/contact-messages src/routeTree.gen.ts
git commit -m "feat: add siwarga-contact-messages inbox"
```

---

## Plan Self-Review Notes

- **Spec coverage:** §3.2 permission table → Task 1 (`announcements.manage`/`.view`/`.trash`, `contact-messages.view`, Bendahara's category restriction implemented in `AnnouncementPolicy`, not a generic gate, per the spec's own explicit instruction). §3.1 authenticated `announcements` CRUD + "termasuk assign target dan trigger publish" → Tasks 2-3. §3.1 `contact-messages` (index, mark-read, "read only dari sisi admin") → Task 4. §3.3 WAHA broadcast (queued job, per-number throttle, catch-and-log per-iteration failures, no separate delivery-status table) → Task 3. §3.4 rich text sanitization → Task 2's `AnnouncementService` reuses Plan A's `HtmlSanitizer`, same as Plan B's `PageService`. §4 `siwarga-announcements` (table + form + Tiptap + category/target picker + publish button) → Tasks 7-8. §4 `siwarga-contact-messages` (inbox, mark read) → Task 9. §4 "Dependency baru: Tiptap" → Task 6.
- **Explicitly out of scope, and why:** bulk-delete/bulk-restore/trash-bin UI for `announcements` (Global Constraints) — the spec's frontend section for `siwarga-announcements` doesn't call for it, and building a category-restricted *bulk* authorization path correctly would roughly double this plan's size for a feature nobody asked for; a follow-up plan can add it if needed. Read-receipts (`announcement_reads`, built in Plan A but with no writer here) — there is no authenticated warga-facing announcements list anywhere in this codebase yet to mark something "read" from; wiring read receipts needs that warga self-service surface to exist first, which is a separate sub-project not covered by the A–F decomposition discussed so far. Retrofitting `siwarga-pages`' plain textarea to Tiptap — Plan B deferred this decision explicitly; this plan only introduces Tiptap for the resource the spec names (`siwarga-announcements`), noted as a clearly-flagged follow-up opportunity rather than silent scope creep.
- **Type consistency check:** `Announcement`/`CreateAnnouncementRequest`/`UpdateAnnouncementRequest` (Task 5) match `AnnouncementResource`'s JSON shape (Task 2) field-for-field, including `target_house_ids: number[]` on both sides. `ContactMessage` (Task 5) matches `ContactMessageResource` (Task 4). The publish flow's return shape (`{data: null, message: string}`) matches `usePublishAnnouncement`'s `onSuccess` handler reading `response.data.message`.
- **Authorization design departs from this codebase's usual flat `can:permission.name` convention on purpose**: `update`/`delete`/`restore`/`publish` use `$this->authorize()` (Laravel's built-in policy auto-discovery for `Announcement` → `AnnouncementPolicy`) instead of `Gate::define()` + `can:` middleware, because those four actions need the *specific announcement's category*, which flat named gates (as used everywhere else in this codebase) cannot express without either duplicating the gate name's target method per HTTP verb or passing a route-bound model into a generically-named gate that different actions would then contend over. This is called out explicitly in the plan's Architecture section and Task 2's Interfaces block so an implementer doesn't "fix" it back to the flat pattern out of habit.
- **A prior mistake caught during self-review:** an earlier pass considered gating `store`, `update`, and `destroy` all under one `Gate::define('announcements.manage', [AnnouncementPolicy::class, 'update'])`, matching the `due-types.manage`-for-everything pattern. This silently breaks for Announcements specifically, because unlike `DueTypePolicy::update(User $user)` (no model, blanket permission check), `AnnouncementPolicy::update(User $user, Announcement $announcement)` needs the model — and Laravel's `can:announcements.manage` middleware (no second arg) never resolves a model for the gate, so the category check would always see no announcement and either always pass or always fail depending on how the method defaulted its second parameter. Fixed by splitting `store` (permission-only, via `Gate::define`) from `update`/`delete`/`restore`/`publish` (model-aware, via `$this->authorize()`).
