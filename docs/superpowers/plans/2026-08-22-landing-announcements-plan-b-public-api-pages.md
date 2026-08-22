# Plan B: Public API, Pages Admin & Astro Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the backend's public read-only API (pages, announcements, events, contact form) and admin Pages CRUD, then wire the already-designed Astro landing app (`src/landing/`) to consume real data instead of its current static placeholder arrays, with correct hybrid rendering (static Beranda/Profil/Kontak, SSR-on-demand Blog/Kegiatan).

**Architecture:** Public endpoints live under a new `Route::prefix('public')` group in `routes/api.php`, entirely outside the `auth:sanctum` group — separate controller classes (`Public*Controller`) from the existing authenticated admin controllers, each backed by a dedicated `Public*Resource` that only exposes what a public visitor should see. Admin Pages CRUD follows this codebase's existing Controller → Policy → Service pattern, but is deliberately thin (no bulk-delete/restore/trash — `pages` rows are fixed by slug and never created or deleted). The Astro app moves from `output: 'static'` to `output: 'server'` (the `@astrojs/node` adapter is already configured from the design pass) so that `export const prerender = true` can mark Beranda/Profil/Kontak as build-time static while Blog/Kegiatan default to SSR.

**Tech Stack:** Laravel 13, PHPUnit (class-based), MySQL, Astro 5 with `@astrojs/node` (already installed), native `fetch` for the Astro-to-API calls (no new HTTP client dependency).

**Spec:** `docs/superpowers/specs/2026-08-21-landing-announcements-design.md` (§3.1 route split, §3.2 permissions, §5 Astro hybrid rendering table). Also see `DESIGN.md` and `PRODUCT.md` at repo root for the already-built Astro visual system this plan wires up.

## Global Constraints

- **Public routes never require `auth:sanctum`** — they live in a separate `Route::prefix('public')` group in `routes/api.php`, added after the existing `auth:sanctum` group, at the top level (not nested inside it).
- **`pages` stays update-only** — no `store`/`destroy`/bulk endpoints. The slug list is fixed (`home`, `profil-komplek`, `kontak`) and is never extended through the API in this plan.
- **Public resources are separate classes from admin resources** — a `Public*Resource` never exposes `created_by`/`updated_by`/soft-delete state; it exposes only what an unauthenticated visitor should see.
- **Every rich-text field admins can edit (`pages.content`) is sanitized server-side** via `App\Services\HtmlSanitizer::sanitize()` (built in Plan A) before it is persisted, since public pages render it unauthenticated.
- **`POST /public/contact` is rate-limited** via a named `RateLimiter::for('contact', ...)` definition, not an inline `throttle:N,1`, so the limit is discoverable and testable in one place.
- Follow Pint formatting (`vendor/bin/pint --dirty --format agent`) before each PHP commit.
- Astro pages that fetch the API do so with plain `fetch()` against `import.meta.env.PUBLIC_API_URL` — no axios/ky dependency is added to `src/landing/`.
- The React admin frontend does **not** get a rich-text editor (Tiptap) in this plan — `pages.content` is edited as a plain `<textarea>` of raw HTML. Tiptap is introduced in Plan C, which the design spec ties specifically to `siwarga-announcements`; Plan B keeps this plan's frontend dependency footprint at zero new packages.

---

### Task 1: CORS configuration for public API access

**Files:**
- Create: `src/backend/config/cors.php`
- Modify: `src/backend/.env.example`

**Interfaces:**
- Produces: `config('cors.allowed_origins')` sourced from `env('CORS_ALLOWED_ORIGINS')`, a comma-separated list. Consumed by Laravel's built-in `Illuminate\Http\Middleware\HandleCors` (already in the global middleware stack — no `bootstrap/app.php` change needed).

There is no `config/cors.php` in this repo yet, so `Illuminate\Http\Middleware\HandleCors` currently runs with an empty options array (`allowedOrigins = []`), meaning cross-origin browser requests get no `Access-Control-Allow-Origin` header. The Astro app's Kontak page does a client-side `fetch()` to `POST /public/contact` from its own origin (a different port than the backend), so this must be fixed before Task 7's public contact endpoint is usable from a browser.

- [ ] **Step 1: Write the config file**

```php
<?php

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', '*'))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
```

- [ ] **Step 2: Add the env var**

In `.env.example`, add after the `WAHA_*` block:

```
CORS_ALLOWED_ORIGINS=*
```

- [ ] **Step 3: Verify manually**

Run: `php artisan config:clear && php artisan tinker --execute 'dd(config("cors"));'`
Expected: prints the array from Step 1, `allowed_origins` is `['*']` (the default when `CORS_ALLOWED_ORIGINS` is unset locally).

There is no automated test for global middleware configuration in this repo (consistent with Plan A's Task 9/10 precedent for infra-only changes) — Task 4's feature test exercises the public routes over HTTP through PHPUnit, which does not go through the browser CORS layer, so this step's manual check is the only verification for the CORS headers themselves.

- [ ] **Step 4: Commit**

```bash
git add config/cors.php .env.example
git commit -m "feat: add CORS config for public API access"
```

---

### Task 2: `pages.manage` permission, gate, and policy

**Files:**
- Modify: `app/Models/Permission.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Create: `app/Policies/PagePolicy.php`
- Test: `tests/Unit/PagePolicyTest.php`

**Interfaces:**
- Produces: `App\Policies\PagePolicy` with `view(User $user): bool` and `update(User $user): bool`, both checking `$user->hasPermission('pages.manage')`.
- Produces: `Gate::define('pages.manage', [PagePolicy::class, 'update'])`, consumed by Task 3's route middleware `can:pages.manage`.
- Produces: permission row `pages.manage` in `Permission::SYSTEM_PERMISSIONS`, picked up automatically by admin (`RoleSeeder` syncs `Permission::all()` to the `admin` role) — no `RoleSeeder` change needed since `pages.manage` is admin-only per the spec's permission table (§3.2).

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\User;
use App\Policies\PagePolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PagePolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_pages()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $admin->load('roles.permissions');

        $this->assertTrue((new PagePolicy)->update($admin));
    }

    public function test_warga_cannot_update_pages()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $warga = User::factory()->create();
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');

        $this->assertFalse((new PagePolicy)->update($warga));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/PagePolicyTest.php`
Expected: FAIL — class `App\Policies\PagePolicy` not found.

- [ ] **Step 3: Add the permission**

In `app/Models/Permission.php`, add to `SYSTEM_PERMISSIONS` after the `houses.assign` line (grouping it with the other content-adjacent permissions is unnecessary — insert alphabetically-by-feature at the top, right after the `houses.*` block, since `pages` is the first v2 feature this codebase gets):

```php
        'houses.assign' => 'Assign penghuni ke rumah',
        'pages.manage' => 'Kelola halaman landing (Beranda, Profil Komplek, Kontak)',
        'due-types.view' => 'Lihat jenis iuran',
```

- [ ] **Step 4: Write the policy**

```php
<?php

namespace App\Policies;

use App\Models\User;

class PagePolicy
{
    public function view(User $user): bool
    {
        return $user->hasPermission('pages.manage');
    }

    public function update(User $user): bool
    {
        return $user->hasPermission('pages.manage');
    }
}
```

- [ ] **Step 5: Register the gate**

In `app/Providers/AppServiceProvider.php`, add the import `use App\Policies\PagePolicy;` and register the gate in `registerGates()`, right after the `houses.*` block:

```php
        // Pages
        Gate::define('pages.manage', [PagePolicy::class, 'update']);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test --compact tests/Unit/PagePolicyTest.php`
Expected: PASS (2 tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Models/Permission.php app/Providers/AppServiceProvider.php app/Policies/PagePolicy.php tests/Unit/PagePolicyTest.php
git commit -m "feat: add pages.manage permission, gate, and policy"
```

---

### Task 3: Admin Pages backend (resource, service, controller, routes)

**Files:**
- Create: `app/Http/Resources/PageResource.php`
- Create: `app/Services/PageService.php`
- Create: `app/Http/Controllers/Api/PageController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/PageTest.php`

**Interfaces:**
- Consumes: `App\Models\Page` (Plan A), `App\Services\HtmlSanitizer::sanitize()` (Plan A).
- Produces: `App\Http\Resources\PageResource` — JSON shape `{id, slug, title, content, hero_image_url, updated_by, updated_at}`.
- Produces: `App\Services\PageService::update(Page $page, array $data, ?UploadedFile $heroImage): Page` — sanitizes `content` via `HtmlSanitizer` when present, stores `$heroImage` to the `public` disk under `page-hero-images/` when present, sets `updated_by` to the acting user's id.
- Produces: routes `GET /api/pages/{slug}` and `POST /api/pages/{slug}` (multipart with `_method=PUT` spoofing, matching the `residents` upload pattern), both gated by `can:pages.manage`.

- [ ] **Step 1: Write the failing test**

```php
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/PageTest.php`
Expected: FAIL — route `pages.show` not found (404 on every request, or resource class missing).

- [ ] **Step 3: Write the resource**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'content' => $this->content,
            'hero_image_url' => $this->hero_image ? Storage::disk('public')->url($this->hero_image) : null,
            'updated_by' => $this->updated_by,
            'updated_at' => $this->updated_at,
        ];
    }
}
```

- [ ] **Step 4: Write the service**

```php
<?php

namespace App\Services;

use App\Models\Page;
use Illuminate\Http\UploadedFile;

class PageService
{
    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Page $page, array $data, ?UploadedFile $heroImage, int $userId): Page
    {
        if (array_key_exists('content', $data)) {
            $data['content'] = $this->htmlSanitizer->sanitize($data['content']);
        }

        if ($heroImage !== null) {
            $data['hero_image'] = $heroImage->store('page-hero-images', 'public');
        }

        $data['updated_by'] = $userId;

        $page->update($data);

        return $page;
    }
}
```

- [ ] **Step 5: Write the controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PageResource;
use App\Models\Page;
use App\Services\PageService;
use Illuminate\Http\Request;

class PageController extends Controller
{
    public function __construct(private PageService $pageService) {}

    public function show(string $slug)
    {
        $page = Page::where('slug', $slug)->firstOrFail();

        return new PageResource($page);
    }

    public function update(Request $request, string $slug)
    {
        $page = Page::where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'content' => ['sometimes', 'nullable', 'string'],
            'hero_image' => ['sometimes', 'nullable', 'image', 'max:2048'],
        ]);

        unset($validated['hero_image']);

        $page = $this->pageService->update($page, $validated, $request->file('hero_image'), $request->user()->id);

        return new PageResource($page);
    }
}
```

- [ ] **Step 6: Add the routes**

In `routes/api.php`, add the import `use App\Http\Controllers\Api\PageController;` and add the routes inside the existing `auth:sanctum` group, after the `// Houses` block:

```php
    // Pages
    Route::get('pages/{slug}', [PageController::class, 'show'])->middleware('can:pages.manage');
    Route::put('pages/{slug}', [PageController::class, 'update'])->middleware('can:pages.manage');
```

Only `PUT` is registered, matching the `residents`/`houses` convention exactly: multipart file uploads (the `hero_image` field) can't be sent as a real `PUT` request from a browser, so the frontend (Task 9) sends a real `POST` with `_method=PUT` in the body — Laravel transparently routes that to the `PUT` route definition, no separate `POST` route needed.

- [ ] **Step 7: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/PageTest.php`
Expected: PASS (8 tests)

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Resources/PageResource.php app/Services/PageService.php app/Http/Controllers/Api/PageController.php routes/api.php tests/Feature/Api/PageTest.php
git commit -m "feat: add admin pages update endpoint"
```

---

### Task 4: Public Pages API

**Files:**
- Create: `app/Http/Resources/PublicPageResource.php`
- Create: `app/Http/Controllers/Api/PublicPageController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/PublicApiTest.php`

**Interfaces:**
- Produces: `App\Http\Resources\PublicPageResource` — JSON shape `{slug, title, content, hero_image_url}` (no `id`, `updated_by`, timestamps — a public visitor doesn't need them).
- Produces: `App\Http\Controllers\Api\PublicPageController::show(string $slug)`, route `GET /api/public/pages/{slug}`, no `auth:sanctum` middleware.

- [ ] **Step 1: Write the failing test**

```php
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/PublicApiTest.php`
Expected: FAIL — route not found.

- [ ] **Step 3: Write the resource**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PublicPageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'content' => $this->content,
            'hero_image_url' => $this->hero_image ? Storage::disk('public')->url($this->hero_image) : null,
        ];
    }
}
```

- [ ] **Step 4: Write the controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicPageResource;
use App\Models\Page;

class PublicPageController extends Controller
{
    public function show(string $slug)
    {
        $page = Page::where('slug', $slug)->firstOrFail();

        return new PublicPageResource($page);
    }
}
```

- [ ] **Step 5: Add the public route group**

In `routes/api.php`, add the import `use App\Http\Controllers\Api\PublicPageController;`, then add a new top-level group **after** the closing `});` of the existing `auth:sanctum` group (not nested inside it):

```php
Route::prefix('public')->group(function () {
    Route::get('pages/{slug}', [PublicPageController::class, 'show']);
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/PublicApiTest.php`
Expected: PASS (3 tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Resources/PublicPageResource.php app/Http/Controllers/Api/PublicPageController.php routes/api.php tests/Feature/Api/PublicApiTest.php
git commit -m "feat: add public pages endpoint"
```

---

### Task 5: Public Announcements API

**Files:**
- Create: `app/Http/Resources/PublicAnnouncementResource.php`
- Create: `app/Http/Controllers/Api/PublicAnnouncementController.php`
- Modify: `routes/api.php`
- Modify: `tests/Feature/Api/PublicApiTest.php`

**Interfaces:**
- Consumes: `App\Models\Announcement` (Plan A) — fields `is_public`, `published_at`.
- Produces: `App\Http\Resources\PublicAnnouncementResource` — `{slug, title, content, category, published_at}`.
- Produces: `App\Http\Controllers\Api\PublicAnnouncementController::index()` (only `is_public = true` and `published_at <= now()`, ordered `published_at desc`) and `::show(string $slug)` (same filters, 404 otherwise so an unpublished/private announcement's slug isn't guessable-reachable). Routes: `GET /api/public/announcements`, `GET /api/public/announcements/{slug}`.

- [ ] **Step 1: Add the failing tests**

Append to `tests/Feature/Api/PublicApiTest.php` (add `use App\Models\Announcement;` to the imports):

```php
    public function test_public_announcements_index_only_returns_published_public_announcements()
    {
        Announcement::factory()->create(['is_public' => true, 'published_at' => now()->subDay(), 'title' => 'Terlihat']);
        Announcement::factory()->create(['is_public' => false, 'published_at' => now()->subDay(), 'title' => 'Privat']);
        Announcement::factory()->create(['is_public' => true, 'published_at' => now()->addDay(), 'title' => 'Belum Terbit']);

        $response = $this->getJson('/api/public/announcements');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['title' => 'Terlihat']);
    }

    public function test_public_announcement_show_returns_404_for_private_announcement()
    {
        Announcement::factory()->create(['slug' => 'privat', 'is_public' => false]);

        $response = $this->getJson('/api/public/announcements/privat');

        $response->assertStatus(404);
    }

    public function test_public_announcement_show_returns_the_announcement()
    {
        Announcement::factory()->create(['slug' => 'kerja-bakti', 'is_public' => true, 'published_at' => now()->subHour(), 'title' => 'Kerja Bakti']);

        $response = $this->getJson('/api/public/announcements/kerja-bakti');

        $response->assertStatus(200)->assertJsonPath('data.title', 'Kerja Bakti');
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/PublicApiTest.php`
Expected: FAIL — route not found for the three new tests (the existing pages tests still pass).

- [ ] **Step 3: Write the resource**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicAnnouncementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'content' => $this->content,
            'category' => $this->category,
            'published_at' => $this->published_at,
        ];
    }
}
```

- [ ] **Step 4: Write the controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicAnnouncementResource;
use App\Models\Announcement;

class PublicAnnouncementController extends Controller
{
    public function index()
    {
        $announcements = Announcement::query()
            ->where('is_public', true)
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
            ->get();

        return PublicAnnouncementResource::collection($announcements);
    }

    public function show(string $slug)
    {
        $announcement = Announcement::query()
            ->where('slug', $slug)
            ->where('is_public', true)
            ->where('published_at', '<=', now())
            ->firstOrFail();

        return new PublicAnnouncementResource($announcement);
    }
}
```

- [ ] **Step 5: Add the routes**

In `routes/api.php`, add the import `use App\Http\Controllers\Api\PublicAnnouncementController;` and add to the `Route::prefix('public')` group from Task 4:

```php
    Route::get('announcements', [PublicAnnouncementController::class, 'index']);
    Route::get('announcements/{slug}', [PublicAnnouncementController::class, 'show']);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/PublicApiTest.php`
Expected: PASS (6 tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Resources/PublicAnnouncementResource.php app/Http/Controllers/Api/PublicAnnouncementController.php routes/api.php tests/Feature/Api/PublicApiTest.php
git commit -m "feat: add public announcements endpoints"
```

---

### Task 6: Public Events API

**Files:**
- Create: `app/Http/Resources/PublicEventResource.php`
- Create: `app/Http/Resources/PublicEventDocumentationResource.php`
- Create: `app/Http/Controllers/Api/PublicEventController.php`
- Modify: `routes/api.php`
- Modify: `tests/Feature/Api/PublicApiTest.php`

**Interfaces:**
- Consumes: `App\Models\Event`, `App\Models\EventDocumentation` (Plan A).
- Produces: `App\Http\Resources\PublicEventDocumentationResource` — `{media_type, file_url, caption}`.
- Produces: `App\Http\Resources\PublicEventResource` — `{slug, title, description, starts_at, ends_at, status, documentation: [...]}` (via `whenLoaded('documentation')`).
- Produces: `App\Http\Controllers\Api\PublicEventController::index()` (`is_public = true`, ordered `starts_at asc`) and `::show(string $slug)` (same filter, eager-loads `documentation`, 404 otherwise). Routes: `GET /api/public/events`, `GET /api/public/events/{slug}`.

- [ ] **Step 1: Add the failing tests**

Append to `tests/Feature/Api/PublicApiTest.php` (add `use App\Models\Event;` and `use App\Models\EventDocumentation;` to imports):

```php
    public function test_public_events_index_only_returns_public_events()
    {
        Event::factory()->create(['is_public' => true, 'title' => 'Terlihat', 'starts_at' => now()->addDay()]);
        Event::factory()->create(['is_public' => false, 'title' => 'Privat', 'starts_at' => now()->addDay()]);

        $response = $this->getJson('/api/public/events');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['title' => 'Terlihat']);
    }

    public function test_public_event_show_returns_404_for_private_event()
    {
        Event::factory()->create(['slug' => 'privat', 'is_public' => false]);

        $response = $this->getJson('/api/public/events/privat');

        $response->assertStatus(404);
    }

    public function test_public_event_show_includes_documentation()
    {
        $event = Event::factory()->create(['slug' => 'kerja-bakti', 'is_public' => true]);
        EventDocumentation::factory()->create(['event_id' => $event->id, 'media_type' => 'foto', 'caption' => 'Dokumentasi']);

        $response = $this->getJson('/api/public/events/kerja-bakti');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.documentation')
            ->assertJsonPath('data.documentation.0.caption', 'Dokumentasi');
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/PublicApiTest.php`
Expected: FAIL — route not found for the three new tests.

- [ ] **Step 3: Write the resources**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PublicEventDocumentationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'media_type' => $this->media_type,
            'file_url' => Storage::disk('public')->url($this->file_path),
            'caption' => $this->caption,
        ];
    }
}
```

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'description' => $this->description,
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'status' => $this->status,
            'documentation' => PublicEventDocumentationResource::collection($this->whenLoaded('documentation')),
        ];
    }
}
```

- [ ] **Step 4: Write the controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicEventResource;
use App\Models\Event;

class PublicEventController extends Controller
{
    public function index()
    {
        $events = Event::query()
            ->where('is_public', true)
            ->orderBy('starts_at')
            ->get();

        return PublicEventResource::collection($events);
    }

    public function show(string $slug)
    {
        $event = Event::query()
            ->where('slug', $slug)
            ->where('is_public', true)
            ->with('documentation')
            ->firstOrFail();

        return new PublicEventResource($event);
    }
}
```

- [ ] **Step 5: Add the routes**

In `routes/api.php`, add the import `use App\Http\Controllers\Api\PublicEventController;` and add to the `Route::prefix('public')` group:

```php
    Route::get('events', [PublicEventController::class, 'index']);
    Route::get('events/{slug}', [PublicEventController::class, 'show']);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/PublicApiTest.php`
Expected: PASS (9 tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Resources/PublicEventResource.php app/Http/Resources/PublicEventDocumentationResource.php app/Http/Controllers/Api/PublicEventController.php routes/api.php tests/Feature/Api/PublicApiTest.php
git commit -m "feat: add public events endpoints"
```

---

### Task 7: Public Contact endpoint (rate-limited)

**Files:**
- Create: `app/Http/Controllers/Api/ContactMessageController.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Modify: `routes/api.php`
- Modify: `tests/Feature/Api/PublicApiTest.php`

**Interfaces:**
- Consumes: `App\Models\ContactMessage` (Plan A).
- Produces: `App\Http\Controllers\Api\ContactMessageController::store(Request $request)`, route `POST /api/public/contact`, throttled via a named `contact` rate limiter (3 requests/minute per IP).

- [ ] **Step 1: Add the failing tests**

Append to `tests/Feature/Api/PublicApiTest.php` (add `use App\Models\ContactMessage;` to imports):

```php
    public function test_public_contact_form_creates_a_message()
    {
        $response = $this->postJson('/api/public/contact', [
            'name' => 'Budi',
            'email' => 'budi@example.com',
            'phone' => '081234567890',
            'message' => 'Halo, saya ingin bertanya soal jadwal kerja bakti.',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('contact_messages', ['name' => 'Budi', 'status' => 'new']);
    }

    public function test_public_contact_form_validates_required_fields()
    {
        $response = $this->postJson('/api/public/contact', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['name', 'message']);
    }

    public function test_public_contact_form_is_rate_limited()
    {
        $payload = ['name' => 'Budi', 'message' => 'Halo'];

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/public/contact', $payload)->assertStatus(201);
        }

        $this->postJson('/api/public/contact', $payload)->assertStatus(429);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Api/PublicApiTest.php`
Expected: FAIL — route not found for the three new tests.

- [ ] **Step 3: Register the rate limiter**

In `app/Providers/AppServiceProvider.php`, add imports `use Illuminate\Cache\RateLimiting\Limit;` and `use Illuminate\Support\Facades\RateLimiter;`, then add a new method and call it from `boot()`:

```php
    public function boot(): void
    {
        $this->configureDefaults();
        $this->registerGates();
        $this->registerActivityLogObservers();
        $this->registerRateLimiters();
    }
```

```php
    /**
     * Register named rate limiters for public-facing routes.
     */
    protected function registerRateLimiters(): void
    {
        RateLimiter::for('contact', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });
    }
```

Add `use Illuminate\Http\Request;` to the imports if not already present (it is not, in the current file).

- [ ] **Step 4: Write the controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactMessageController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'max:20'],
            'message' => ['required', 'string'],
        ]);

        $message = ContactMessage::create([...$validated, 'status' => 'new']);

        return response()->json(['data' => ['id' => $message->id], 'message' => 'Pesan terkirim'], 201);
    }
}
```

- [ ] **Step 5: Add the route**

In `routes/api.php`, add the import `use App\Http\Controllers\Api\ContactMessageController;` and add to the `Route::prefix('public')` group:

```php
    Route::post('contact', [ContactMessageController::class, 'store'])->middleware('throttle:contact');
```

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Api/PublicApiTest.php`
Expected: PASS (12 tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/Api/ContactMessageController.php app/Providers/AppServiceProvider.php routes/api.php tests/Feature/Api/PublicApiTest.php
git commit -m "feat: add rate-limited public contact endpoint"
```

---

### Task 8: React admin — Pages types, service, and hooks

**Files:**
- Modify: `src/frontend/src/types/api.ts`
- Create: `src/frontend/src/services/pages.ts`
- Create: `src/frontend/src/hooks/use-pages.ts`

**Interfaces:**
- Produces: TypeScript type `Page` (`{id, slug, title, content, hero_image_url, updated_by, updated_at}`), `UpdatePageRequest` (`{title?: string, content?: string, hero_image?: File}`).
- Produces: `pagesService.getBySlug(slug: string)`, `pagesService.update(slug: string, data: UpdatePageRequest)`.
- Produces: `usePage(slug: string)`, `useUpdatePage(slug: string)` — TanStack Query hooks, consumed by Task 9's form component.

- [ ] **Step 1: Add the types**

In `src/frontend/src/types/api.ts`, add after the `Resident` interface block:

```typescript
export interface Page {
  id: number
  slug: string
  title: string
  content: string | null
  hero_image_url: string | null
  updated_by: number | null
  updated_at: string
}

export interface UpdatePageRequest {
  title?: string
  content?: string
  hero_image?: File
}
```

- [ ] **Step 2: Write the service**

```typescript
import type { ApiResponse, Page, UpdatePageRequest } from '@/types/api'
import api from './api'

function toPageFormData(data: UpdatePageRequest) {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value)
    }
  })
  return formData
}

export const pagesService = {
  getBySlug: (slug: string) => api.get<ApiResponse<Page>>(`/api/pages/${slug}`),
  update: (slug: string, data: UpdatePageRequest) => {
    const formData = toPageFormData(data)
    formData.append('_method', 'PUT')
    return api.post<ApiResponse<Page>>(`/api/pages/${slug}`, formData, {
      headers: { 'Content-Type': undefined },
    })
  },
}
```

- [ ] **Step 3: Write the hooks**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pagesService } from '@/services/pages'
import type { UpdatePageRequest } from '@/types/api'
import { toast } from 'sonner'

export function usePage(slug: string) {
  return useQuery({
    queryKey: ['pages', slug],
    queryFn: () => pagesService.getBySlug(slug),
    select: (res) => res.data.data,
    enabled: !!slug,
  })
}

export function useUpdatePage(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePageRequest) => pagesService.update(slug, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pages', slug] })
      toast.success('Halaman berhasil diperbarui')
    },
  })
}
```

- [ ] **Step 4: Verify with the type checker**

Run: `npm run build`
Expected: `tsc -b` passes with no new errors (the new files and edited `types/api.ts` compile cleanly; there is no other verification available for a types/service/hooks-only change with no UI yet — Task 9 exercises this against a real form).

- [ ] **Step 5: Commit**

```bash
git add src/types/api.ts src/services/pages.ts src/hooks/use-pages.ts
git commit -m "feat: add pages types, service, and query hooks"
```

---

### Task 9: React admin — `siwarga-pages` feature module

**Files:**
- Create: `src/frontend/src/features/siwarga-pages/page-form.tsx`
- Create: `src/frontend/src/features/siwarga-pages/index.tsx`
- Create: `src/frontend/src/routes/_authenticated/pages/index.tsx`
- Modify: `src/frontend/src/components/layout/data/sidebar-data.ts`

**Interfaces:**
- Consumes: `usePage`, `useUpdatePage` (Task 8).
- Produces: route `/pages`, page component `PagesPage`, gated on `pages.manage` (matching the `due-types.view`-style permission-gated sidebar entry pattern).

This is a form-per-slug screen, not a table: three fixed slugs (`home`, `profil-komplek`, `kontak`) are edited via a tab switcher, each tab rendering an independent `PageForm` bound to that slug (no create/delete UI — the slug list is fixed, matching the backend's update-only design from Task 3).

- [ ] **Step 1: Write the form component**

```tsx
import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePage, useUpdatePage } from '@/hooks/use-pages'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

const formSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi.'),
  content: z.string().optional(),
  hero_image: z.instanceof(File).optional(),
})

type PageFormValues = z.infer<typeof formSchema>

export function PageForm({ slug }: { slug: string }) {
  const { data: page, isLoading } = usePage(slug)
  const updatePage = useUpdatePage(slug)

  const form = useForm<PageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', content: '', hero_image: undefined },
  })

  useEffect(() => {
    if (page) {
      form.reset({ title: page.title, content: page.content ?? '', hero_image: undefined })
    }
  }, [page, form])

  const onSubmit = (data: PageFormValues) => {
    updatePage.mutate(data)
  }

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-9 w-full' />
        <Skeleton className='h-40 w-full' />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='max-w-2xl space-y-4'>
        <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Judul *</FormLabel>
              <FormControl>
                <Input placeholder='Judul halaman' autoComplete='off' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='content'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Konten (HTML)</FormLabel>
              <FormControl>
                <Textarea rows={10} placeholder='<p>Isi halaman...</p>' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='hero_image'
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Gambar Hero</FormLabel>
              <FormControl>
                <Input
                  type='file'
                  accept='image/*'
                  onChange={(e) => onChange(e.target.files?.[0] ?? undefined)}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              {page?.hero_image_url && (
                <img
                  src={page.hero_image_url}
                  alt='Gambar hero saat ini'
                  className='h-32 w-auto rounded-md border object-contain'
                />
              )}
            </FormItem>
          )}
        />
        <Button type='submit' disabled={updatePage.isPending}>
          {updatePage.isPending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </form>
    </Form>
  )
}
```

- [ ] **Step 2: Write the page component**

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PageForm } from './page-form'

const PAGE_TABS = [
  { slug: 'home', label: 'Beranda' },
  { slug: 'profil-komplek', label: 'Profil Komplek' },
  { slug: 'kontak', label: 'Kontak' },
] as const

export function PagesPage() {
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
          <h2 className='text-2xl font-bold tracking-tight'>Halaman Landing</h2>
          <p className='text-muted-foreground'>
            Kelola konten Beranda, Profil Komplek, dan Kontak yang tampil di situs publik.
          </p>
        </div>

        <Tabs defaultValue='home'>
          <TabsList>
            {PAGE_TABS.map((tab) => (
              <TabsTrigger key={tab.slug} value={tab.slug}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PAGE_TABS.map((tab) => (
            <TabsContent key={tab.slug} value={tab.slug} className='pt-4'>
              <PageForm slug={tab.slug} />
            </TabsContent>
          ))}
        </Tabs>
      </Main>
    </>
  )
}
```

- [ ] **Step 3: Register the route**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { PagesPage } from '@/features/siwarga-pages'

export const Route = createFileRoute('/_authenticated/pages/')({
  component: PagesPage,
})
```

- [ ] **Step 4: Add the sidebar entry**

In `src/frontend/src/components/layout/data/sidebar-data.ts`, add to the `Data Master` group's `items` array, after the `Jenis Iuran` entry:

```typescript
        {
          title: 'Halaman Landing',
          url: '/pages',
          icon: FileText,
          permission: 'pages.manage',
        },
```

Add `FileText` to the `lucide-react` import at the top of the file if it is not already imported.

- [ ] **Step 5: Regenerate the route tree and verify the build**

Run: `npm run dev` briefly (TanStack Router's Vite plugin regenerates `routeTree.gen.ts` on start) then stop it, or run `npx tsr generate` if the project exposes that script — check `package.json` for the exact command name before running.
Run: `npm run build`
Expected: build succeeds, `/pages` route resolves with no TypeScript errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev` (with the backend running and seeded), log in as `admin@siwarga.test`, navigate to `/pages`, confirm all three tabs load existing content (seeded empty/placeholder rows from Plan A's migrations are fine — Plan A did not seed sample `pages` rows, so expect empty title/content on first load) and that editing + saving a tab persists after a page refresh.

- [ ] **Step 7: Commit**

```bash
git add src/features/siwarga-pages src/routes/_authenticated/pages src/components/layout/data/sidebar-data.ts src/routeTree.gen.ts
git commit -m "feat: add siwarga-pages admin feature module"
```

---

### Task 10: Astro — public API client + wire Beranda, Profil Komplek, Kontak (static)

**Files:**
- Create: `src/landing/src/lib/api.ts`
- Create: `src/landing/.env.example`
- Modify: `src/landing/astro.config.mjs`
- Modify: `src/landing/src/pages/index.astro`
- Modify: `src/landing/src/pages/profil-komplek.astro`
- Modify: `src/landing/src/pages/kontak.astro`

**Interfaces:**
- Produces: `publicApi.getPage(slug: string): Promise<PublicPage | null>`, `publicApi.getAnnouncements(): Promise<PublicAnnouncement[]>`, `publicApi.getEvents(): Promise<PublicEvent[]>` in `src/landing/src/lib/api.ts`, reading `import.meta.env.PUBLIC_API_URL`. Consumed by this task's three pages and Tasks 11–12.
- Consumes: `GET /public/pages/{slug}`, `GET /public/announcements`, `GET /public/events` (Tasks 4–6).

There is no existing test suite in `src/landing/` (confirmed in the design spec §7 — "tidak ada suite existing di repo ini"), so verification for every Astro task in this plan is `npm run build` (must succeed) plus the manual checks each step calls out.

- [ ] **Step 1: Add the env file**

```
PUBLIC_API_URL=http://localhost:8000/api
```

- [ ] **Step 2: Write the API client**

```typescript
const BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000/api'

export interface PublicPage {
  slug: string
  title: string
  content: string | null
  hero_image_url: string | null
}

export interface PublicAnnouncement {
  slug: string
  title: string
  content: string
  category: string
  published_at: string
}

export interface PublicEventDocumentation {
  media_type: 'foto' | 'video'
  file_url: string
  caption: string | null
}

export interface PublicEvent {
  slug: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  status: 'upcoming' | 'ongoing' | 'completed'
  documentation: PublicEventDocumentation[]
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const response = await fetch(`${BASE_URL}${path}`)
  if (!response.ok) {
    return null
  }
  return response.json()
}

export const publicApi = {
  async getPage(slug: string): Promise<PublicPage | null> {
    const json = await fetchJson<{ data: PublicPage }>(`/public/pages/${slug}`)
    return json?.data ?? null
  },
  async getAnnouncements(): Promise<PublicAnnouncement[]> {
    const json = await fetchJson<{ data: PublicAnnouncement[] }>('/public/announcements')
    return json?.data ?? []
  },
  async getAnnouncement(slug: string): Promise<PublicAnnouncement | null> {
    const json = await fetchJson<{ data: PublicAnnouncement }>(`/public/announcements/${slug}`)
    return json?.data ?? null
  },
  async getEvents(): Promise<PublicEvent[]> {
    const json = await fetchJson<{ data: PublicEvent[] }>('/public/events')
    return json?.data ?? []
  },
  async getEvent(slug: string): Promise<PublicEvent | null> {
    const json = await fetchJson<{ data: PublicEvent }>(`/public/events/${slug}`)
    return json?.data ?? null
  },
}
```

- [ ] **Step 3: Switch to server output**

In `astro.config.mjs`, change `output: 'static'` to `output: 'server'`. The `node({ mode: 'standalone' })` adapter line stays as-is — it already supports both prerendered and on-demand routes.

> **Markup note:** the landing app's visual world was redesigned after this plan was first drafted — from a "Gapura Kompleks" theme to a black-and-white "Monokrom" theme (see `DESIGN.md` at the repo root). The class names below (`.hero__lede`, `InfoCard`, `.page-hero__lede`, `.prose-block`, `.info-card`) match the **current** `src/landing/` markup, not the retired gapura one.

- [ ] **Step 4: Wire the Beranda hero to real data**

In `src/pages/index.astro`, replace the hardcoded `pengumuman` and `kegiatan` arrays and the hardcoded hero copy with data fetched at build time. Replace the frontmatter (everything above the closing `---`) with:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import InfoCard from '../components/InfoCard.astro';
import { publicApi } from '../lib/api';

export const prerender = true;

const home = await publicApi.getPage('home');
const announcements = (await publicApi.getAnnouncements()).slice(0, 3);
const events = (await publicApi.getEvents()).slice(0, 3);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const pengumuman = announcements.map((item, i) => ({
  href: `/blog/${item.slug}`,
  title: item.title,
  excerpt: item.content.replace(/<[^>]+>/g, '').slice(0, 140),
  date: formatDate(item.published_at),
  tag: item.category,
  isNew: i === 0,
}));

const kegiatan = events.map((item, i) => ({
  href: `/kegiatan/${item.slug}`,
  title: item.title,
  excerpt: (item.description ?? '').slice(0, 140),
  date: formatDate(item.starts_at),
  tag: 'Kegiatan',
  isNew: i === 0,
}));
---
```

Keep the rest of the template as-is (the `<BaseLayout>` markup, the `.hero`/`.band` sections — including the `dark` prop already passed to the Kegiatan `InfoCard`s — and all `<style>` blocks are unchanged), except: replace the hardcoded `<h1 class="hero__title">Perum Asabri<br />Bumiayu Indah</h1>` with `{home?.title ?? 'Perum Asabri Bumiayu Indah'}` (keep it a plain expression, not `set:html`, since the headline is a short title, not rich content), and replace the hardcoded `<p class="hero__lede text-soft">...</p>` with a `<div>` carrying admin-authored HTML — `set:html` needs a directive on an element, not inside a JSX-like interpolation. Concretely, replace:

```astro
      <p class="hero__lede text-soft">
        Portal warga — pengumuman, kegiatan, dan profil kompleks, terbuka untuk warga
        maupun tamu yang ingin tahu lebih jauh soal lingkungan kami.
      </p>
```

with:

```astro
      <div class="hero__lede text-soft" set:html={home?.content ?? 'Portal warga — pengumuman, kegiatan, dan profil kompleks, terbuka untuk warga maupun tamu yang ingin tahu lebih jauh soal lingkungan kami.'} />
```

`.hero__lede` is styled as a block-level `<p>`-equivalent already (`max-width`, `font-size`), so switching the tag from `p` to `div` does not change its rendered appearance.

- [ ] **Step 5: Wire Profil Komplek to real data**

In `src/pages/profil-komplek.astro`, add at the top of the frontmatter (after the `BaseLayout` import):

```astro
import { publicApi } from '../lib/api';

export const prerender = true;

const page = await publicApi.getPage('profil-komplek');
```

Replace the hardcoded `<h1 class="page-hero__title">` text with `{page?.title ?? 'Perum Asabri Bumiayu Indah'}`, and replace the `.prose-block` section's two hardcoded `<p class="text-soft">` paragraphs (keep the `<h2>Lingkungan yang padat...</h2>` heading as static copy — it isn't sourced from `pages.content`) with a single `<div class="prose-block-body" set:html={page?.content ?? ''} />` placed after the `<h2>`, and add a `.prose-block-body p { color: var(--gray-500); font-size: 1.03rem; margin-bottom: 1.3rem; }` rule to the `<style>` block so admin-authored paragraphs keep the same look the two hardcoded ones had.

- [ ] **Step 6: Wire Kontak's info copy to real data and the form to the real endpoint**

In `src/pages/kontak.astro`, add at the top of the frontmatter:

```astro
import { publicApi } from '../lib/api';

export const prerender = true;

const page = await publicApi.getPage('kontak');
```

Replace the hardcoded `.page-hero__lede` paragraph with `<div class="page-hero__lede text-soft" set:html={page?.content ?? 'Ada pertanyaan, keluhan, atau ingin berkunjung ke Perum Asabri Bumiayu Indah? Kirim pesan lewat formulir di bawah, atau datang langsung ke pos keamanan kami.'} />` (same tag-swap reasoning as Step 4/5). Keep the three static `.info-card` blocks (alamat/pos keamanan/jam layanan) hardcoded — they are structured fields the `pages.content` free-text HTML isn't a good fit for, and the design spec doesn't define structured contact fields beyond the address already known from `PRODUCT.md`.

Replace the `<script>` block's demo `window.setTimeout` submit handler with a real fetch:

```astro
<script>
  const form = document.getElementById('kontak-form') as HTMLFormElement | null;
  const status = document.getElementById('form-status');
  const submit = document.getElementById('form-submit') as HTMLButtonElement | null;

  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000/api';

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!status || !submit) return;

    submit.disabled = true;
    submit.textContent = 'Mengirim…';
    status.textContent = '';
    status.className = 'form-status';

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`${API_URL}/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('request failed');
      }

      status.textContent = 'Pesan terkirim. Pengurus RT akan segera menghubungi Anda.';
      status.className = 'form-status form-status--ok';
      form.reset();
    } catch {
      status.textContent = 'Gagal mengirim pesan. Silakan coba lagi beberapa saat lagi.';
      status.className = 'form-status form-status--error';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Kirim Pesan';
    }
  });
</script>
```

`kontak.astro` already declares a `.form-status--error` rule (added during the Monokrom redesign) — no new style needed here.

- [ ] **Step 7: Build and verify**

Run: `cd src/landing && npm run build`
Expected: build succeeds. Since there is no running backend during a plain `npm run build` in this step, `fetch` calls will fail — confirm the pages still build by having `publicApi.*` fail closed to `null`/`[]` (already handled by `fetchJson`'s `!response.ok` check catching non-2xx, but a network-level failure — connection refused — throws instead of returning a response). Wrap each `publicApi` call site added in Steps 4–6 is unnecessary if `fetchJson` itself catches network errors: update `fetchJson` in Step 2 to wrap the `fetch()` call in try/catch and return `null` on any thrown error, not just non-OK responses, so a backend-down build never fails.

- [ ] **Step 8: Manual verification with the backend running**

Run the backend (`php artisan serve` or `docker compose up backend`) and seed a `pages` row for `home`/`profil-komplek`/`kontak` via `POST /api/pages/{slug}` (through the admin UI from Task 9, or `php artisan tinker`), then `cd src/landing && npm run dev` and confirm `/`, `/profil-komplek`, and `/kontak` render the real content, and that submitting the Kontak form creates a row in `contact_messages`.

- [ ] **Step 9: Commit**

```bash
git add src/landing/src/lib/api.ts src/landing/.env.example src/landing/astro.config.mjs src/landing/src/pages/index.astro src/landing/src/pages/profil-komplek.astro src/landing/src/pages/kontak.astro
git commit -m "feat: wire Beranda, Profil Komplek, and Kontak to the public API"
```

---

### Task 11: Astro — wire Blog (Pengumuman) to real data (SSR)

**Files:**
- Modify: `src/landing/src/pages/blog/index.astro`
- Create: `src/landing/src/pages/blog/[slug].astro`
- Delete: `src/landing/src/pages/blog/kerja-bakti-bulanan-minggu-pertama.astro`

**Interfaces:**
- Consumes: `publicApi.getAnnouncements()`, `publicApi.getAnnouncement(slug)` (Task 10).

> **Markup note:** matches the current Monokrom `src/landing/` markup (`DESIGN.md`), not the retired gapura theme.

- [ ] **Step 1: Wire the Blog index**

In `src/pages/blog/index.astro`, replace the hardcoded `pengumuman` array with a fetch. Replace the frontmatter with:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import InfoCard from '../../components/InfoCard.astro';
import { publicApi } from '../../lib/api';

const announcements = await publicApi.getAnnouncements();

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const pengumuman = announcements.map((item, i) => ({
  href: `/blog/${item.slug}`,
  title: item.title,
  excerpt: item.content.replace(/<[^>]+>/g, '').slice(0, 140),
  date: formatDate(item.published_at),
  tag: item.category,
  isNew: i === 0,
}));
---
```

This page is left without `export const prerender = true`, so under `output: 'server'` (Task 10, Step 3) it defaults to SSR-on-demand — matching §5's rendering table.

- [ ] **Step 2: Replace the single static detail page with a dynamic one**

Delete `src/pages/blog/kerja-bakti-bulanan-minggu-pertama.astro`.

Create `src/pages/blog/[slug].astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { publicApi } from '../../lib/api';

const { slug } = Astro.params;
const announcement = slug ? await publicApi.getAnnouncement(slug) : null;

if (!announcement) {
  return Astro.redirect('/blog');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
---

<BaseLayout title={announcement.title} active="blog">
  <article class="post section-white">
    <header class="post__header wrap">
      <a class="back-link" href="/blog">← Semua pengumuman</a>
      <span class="post__tag text-soft">{announcement.category}</span>
      <h1>{announcement.title}</h1>
      <time class="post__date text-soft tnum">{formatDate(announcement.published_at)}</time>
    </header>

    <div class="post__body wrap" set:html={announcement.content} />
  </article>
</BaseLayout>

<style>
  .post__header {
    padding-block: clamp(2.4rem, 6vw, 3.2rem) 2rem;
    border-bottom: 1px solid var(--gray-300);
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .back-link {
    font-weight: 600;
    font-size: 0.88rem;
    color: var(--ink);
    text-decoration: none;
    margin-bottom: 0.4rem;
  }
  .post__tag {
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .post__header h1 {
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    max-width: 30ch;
    letter-spacing: -0.03em;
  }
  .post__date {
    font-size: 0.92rem;
    font-weight: 500;
  }

  .post__body {
    max-width: 68ch;
    padding-block: 2.6rem 4.5rem;
    font-size: 1.05rem;
    color: var(--ink);
  }
  .post__body :global(p) {
    margin-bottom: 1.2rem;
    max-width: none;
  }
  .post__body :global(a) {
    color: var(--ink);
    font-weight: 600;
  }
</style>
```

This mirrors the static detail page's styling intent exactly (same class names: `.post__header`, `.post__tag`, `.post__date`, `.post__body`) — only the source of `title`/`tag`/`date`/body content moves from hardcoded markup to `announcement.*`, and the body switches from hand-written paragraphs to `set:html={announcement.content}` since admin-authored rich text is already sanitized server-side (Task 3's `PageService`/Plan C's future `AnnouncementService` both sanitize before persisting).

- [ ] **Step 3: Build and verify**

Run: `cd src/landing && npm run build`
Expected: build succeeds — `/blog` and `/blog/[slug]` are SSR routes so they don't execute at build time (only prerendered routes do); this is confirmed by the build log listing them under the server build, not under "prerendering static routes".

- [ ] **Step 4: Manual verification with the backend running**

With the backend running and at least one public+published `Announcement` seeded, run `npm run dev`, visit `/blog`, confirm the seeded announcement appears, click into it, confirm `/blog/{slug}` renders its content. Visit `/blog/does-not-exist` and confirm it redirects to `/blog`.

- [ ] **Step 5: Commit**

```bash
git add src/landing/src/pages/blog
git commit -m "feat: wire Pengumuman/Blog pages to the public API"
```

---

### Task 12: Astro — wire Kegiatan to real data (SSR, with galeri)

**Files:**
- Modify: `src/landing/src/pages/kegiatan/index.astro`
- Create: `src/landing/src/pages/kegiatan/[slug].astro`
- Delete: `src/landing/src/pages/kegiatan/kerja-bakti-blok-a-d.astro`

**Interfaces:**
- Consumes: `publicApi.getEvents()`, `publicApi.getEvent(slug)` (Task 10), including `documentation: PublicEventDocumentation[]`.

> **Markup note:** matches the current Monokrom `src/landing/` markup (`DESIGN.md`), not the retired gapura theme.

- [ ] **Step 1: Wire the Kegiatan index**

In `src/pages/kegiatan/index.astro`, replace the hardcoded `kegiatan` array with a fetch. Replace the frontmatter with:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import InfoCard from '../../components/InfoCard.astro';
import { publicApi } from '../../lib/api';

const events = await publicApi.getEvents();

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const kegiatan = events.map((item, i) => ({
  href: `/kegiatan/${item.slug}`,
  title: item.title,
  excerpt: (item.description ?? '').slice(0, 140),
  date: formatDate(item.starts_at),
  tag: item.status === 'completed' ? 'Selesai' : 'Kegiatan',
  isNew: i === 0,
}));
---
```

No `export const prerender = true` — this defaults to SSR under `output: 'server'`.

- [ ] **Step 2: Replace the single static detail page with a dynamic one, wiring the real galeri**

Delete `src/pages/kegiatan/kerja-bakti-blok-a-d.astro`.

Create `src/pages/kegiatan/[slug].astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { publicApi } from '../../lib/api';

const { slug } = Astro.params;
const event = slug ? await publicApi.getEvent(slug) : null;

if (!event) {
  return Astro.redirect('/kegiatan');
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    + ' · ' + new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}
---

<BaseLayout title={event.title} active="kegiatan">
  <article class="event section-white">
    <header class="event__header wrap">
      <a class="back-link" href="/kegiatan">← Semua kegiatan</a>
      <span class="event__tag text-soft">{event.status === 'completed' ? 'Selesai' : 'Kegiatan'}</span>
      <h1>{event.title}</h1>
      <time class="event__date text-soft tnum">{formatDateTime(event.starts_at)}</time>
    </header>

    <div class="event__body wrap">
      <p>{event.description}</p>
    </div>

    {
      event.documentation.length > 0 && (
        <div class="wrap">
          <h2 class="galeri-title">Galeri Dokumentasi</h2>
          <div class="galeri-grid">
            {event.documentation.map((doc, i) => (
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" class="galeri-item">
                {doc.media_type === 'foto' ? (
                  <img src={doc.file_url} alt={doc.caption ?? event.title} loading="lazy" />
                ) : (
                  <video src={doc.file_url} controls preload="metadata" />
                )}
                {doc.caption && <span class="galeri-item__caption text-soft">{doc.caption}</span>}
              </a>
            ))}
          </div>
        </div>
      )
    }
    {
      event.documentation.length === 0 && (
        <div class="wrap">
          <h2 class="galeri-title">Galeri Dokumentasi</h2>
          <p class="galeri-empty text-soft">Belum ada dokumentasi untuk kegiatan ini.</p>
        </div>
      )
    }
  </article>
</BaseLayout>

<style>
  .event__header {
    padding-block: clamp(2.4rem, 6vw, 3.2rem) 2rem;
    border-bottom: 1px solid var(--gray-300);
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .back-link {
    font-weight: 600;
    font-size: 0.88rem;
    color: var(--ink);
    text-decoration: none;
    margin-bottom: 0.4rem;
  }
  .event__tag {
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .event__header h1 {
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    max-width: 34ch;
    letter-spacing: -0.03em;
  }
  .event__date {
    font-size: 0.92rem;
    font-weight: 500;
  }

  .event__body {
    max-width: 68ch;
    padding-block: 2rem 1rem;
    font-size: 1.05rem;
  }

  .galeri-title {
    font-size: clamp(1.3rem, 2.6vw, 1.7rem);
    letter-spacing: -0.02em;
    margin-block: 2rem 1.4rem;
  }
  .galeri-empty {
    padding-bottom: 4.5rem;
  }

  .galeri-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.2rem;
    padding-bottom: 4.5rem;
  }

  .galeri-item {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    text-decoration: none;
  }
  .galeri-item img,
  .galeri-item video {
    aspect-ratio: 4 / 3;
    width: 100%;
    object-fit: cover;
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
  }
  .galeri-item__caption {
    font-size: 0.85rem;
  }

  @media (max-width: 780px) {
    .galeri-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 460px) {
    .galeri-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

This replaces the design pass's honest flat placeholder tiles ("Foto kegiatan #n — Menyusul dari pengurus RT") with real `<img>`/`<video>` elements once `event_documentation` rows exist — and degrades to the "Belum ada dokumentasi" empty state (not a placeholder tile grid) when an event has none, since a real photo upload flow now exists via the admin (even though the events/kegiatan admin UI itself is Plan D's job, not this plan's — an admin can still attach documentation directly via `POST /api/events/{event}/documentation` once Plan D's routes exist, or via `tinker` for now).

- [ ] **Step 3: Build and verify**

Run: `cd src/landing && npm run build`
Expected: build succeeds, `/kegiatan` and `/kegiatan/[slug]` listed under the server build (SSR), not prerendered.

- [ ] **Step 4: Manual verification with the backend running**

With the backend running and at least one public `Event` seeded (with and without `EventDocumentation` rows, to check both branches), run `npm run dev`, visit `/kegiatan`, click into an event, confirm the galeri grid renders real images/videos, and confirm the empty state renders correctly for an event with no documentation.

- [ ] **Step 5: Commit**

```bash
git add src/landing/src/pages/kegiatan
git commit -m "feat: wire Kegiatan pages and galeri to the public API"
```

---

## Plan Self-Review Notes

- **Spec coverage:** §3.1 public routes → Tasks 4–7 (`GET /public/pages/{slug}`, `GET /public/announcements[/{slug}]`, `GET /public/events[/{slug}]`, `POST /public/contact`). §3.1 admin `pages` (update-only) → Tasks 2–3. §3.4 rich text sanitization → Task 3's `PageService` reuses Plan A's `HtmlSanitizer`. §5 Astro hybrid rendering table → Task 10 (static: Beranda/Profil/Kontak) and Tasks 11–12 (SSR: Blog/Kegiatan). §4 `siwarga-pages` feature module → Tasks 8–9. §7 testing strategy's `PublicApiTest.php` → Tasks 4–7 build it up incrementally in one file, matching the spec's naming exactly.
- **Explicitly out of scope, confirmed against the user's Plan B brief:** admin CRUD/UI for events, announcements, polls, forum, contact-messages (Plans C–F); Tiptap rich-text editor (deferred to Plan C, called out in Global Constraints); `WahaService`/broadcast wiring (Plan A already built the service, Plan C dispatches the job).
- **Type consistency check:** `PublicPage`/`PublicAnnouncement`/`PublicEvent`/`PublicEventDocumentation` TypeScript interfaces (Task 10) match the JSON shapes of `PublicPageResource`/`PublicAnnouncementResource`/`PublicEventResource`/`PublicEventDocumentationResource` (Tasks 4–6) field-for-field. `Page`/`UpdatePageRequest` (Task 8) match `PageResource`'s admin JSON shape (Task 3).
- **Corrected during self-review:** an earlier draft of Task 3 registered both `PUT` and `POST` routes for `pages/{slug}`, reasoning that multipart uploads need a real `POST`. That's wrong — Laravel's `_method` spoofing routes a real `POST` request carrying `_method=PUT` in its body straight to the `PUT` route definition (this is exactly how the existing `residents`/`houses` upload flows already work, with only `Route::put(...)` registered). Fixed to match that precedent exactly: only `PUT` is registered.
- **Patched after the landing page redesign (2026-08-22):** the visual world was rebuilt from "Gapura Kompleks" to a black-and-white "Monokrom" theme after this plan was first written (see `DESIGN.md`), including a hamburger-menu mobile nav. Tasks 10–12's code snippets, `set:html` target elements, and CSS variable names (`.hero__lede`, `InfoCard` instead of `Plakat`, `--radius-card`/`--shadow-card` instead of `--radius`/`--shadow-plakat`, `.info-card` instead of `.info-plakat`, etc.) were rewritten to match the current markup exactly. Task 11's step numbering also had a pre-existing duplicate-"Step 2" bug, fixed in the same pass. Tasks 1–9 (backend) were untouched by the redesign and needed no changes.
