# Plan A: Backend Foundation & Infra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the backend data model, sanitization, WhatsApp-sending, and infrastructure foundation that Plans B–F (Landing Page, Pengumuman, Kegiatan, Polling, Forum) will build on. No controllers, routes, or UI in this plan — only migrations, models, factories, two support services, and running infrastructure (queue worker, WAHA).

**Architecture:** Each new table gets a migration + Eloquent model + factory + a Unit test exercising the model directly (creation, relationships, DB-level constraints), following this codebase's existing `tests/Unit/*ServiceTest.php` style (`RefreshDatabase`, `Tests\TestCase`, real DB assertions — no mocking of the DB layer). `HtmlSanitizer` and `WahaService` are plain service classes under `app/Services/`, tested in isolation (the latter via `Http::fake()`). Infra changes (queue worker, WAHA container) are added to the existing `docker-compose.yml` / `docker-compose.prd.yml` / `docker/supervisord.conf`, validated with `docker compose config` since there is no automated test harness for infra in this repo.

**Tech Stack:** Laravel 13, PHPUnit (class-based, not Pest), MySQL, `mews/purifier` (HTMLPurifier wrapper) for sanitization, Laravel's `Http` facade for the WAHA HTTP client, Docker Compose, `devlikeapro/waha` image.

**Spec:** `docs/superpowers/specs/2026-08-21-landing-announcements-design.md` (§2 Data Model, §3.3 WA broadcast, §3.4 rich text, §6 Infra & queue worker)

## Global Constraints

- **Non-breaking:** every migration in this plan only creates new tables — never modify `residents`, `houses`, `bills`, `payments`, `expenses`, `users`, or any other v1 table.
- **No soft delete / timestamp columns beyond what's in the spec's ERD** — several new tables (`pages`, `event_documentation`, `announcement_targets`, `announcement_reads`, `polls`, `poll_options`, `poll_votes`, `forum_posts`) intentionally have fewer timestamp columns than the app's usual `timestamps() + softDeletes()` pair, matching `docs/ERD-v2.dbml` exactly. Do not add columns the ERD doesn't list.
- **`events.facility_booking_id` is deliberately omitted** in this plan — it references `facility_bookings`, a table from an out-of-scope module (booking fasilitas). It will be added via a follow-up migration when that module is built.
- Every new FK to `users`/`houses` uses `$table->foreignId(...)->constrained(...)`, matching the style in `database/migrations/*_create_bills_table.php` and `*_create_house_residents_table.php`.
- Follow Pint formatting (`vendor/bin/pint --dirty --format agent`) before each commit that touches PHP files.
- All new tests go in `tests/Unit/` (no `tests/Feature/Api/` tests in this plan — there are no controllers yet).

---

### Task 1: `pages` table + model

**Files:**
- Create: `database/migrations/2026_08_21_000001_create_pages_table.php`
- Create: `app/Models/Page.php`
- Create: `database/factories/PageFactory.php`
- Test: `tests/Unit/PageModelTest.php`

**Interfaces:**
- Produces: `App\Models\Page` — fillable `['slug', 'title', 'content', 'hero_image', 'updated_by']`, relation `updatedBy(): BelongsTo` (→ `User`). No soft deletes.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_can_be_created_with_slug_and_content()
    {
        $page = Page::factory()->create([
            'slug' => 'profil-komplek',
            'title' => 'Profil Komplek',
            'content' => '<p>Sejarah singkat komplek.</p>',
        ]);

        $this->assertDatabaseHas('pages', [
            'slug' => 'profil-komplek',
            'title' => 'Profil Komplek',
        ]);
        $this->assertEquals('<p>Sejarah singkat komplek.</p>', $page->content);
    }

    public function test_slug_must_be_unique()
    {
        Page::factory()->create(['slug' => 'kontak']);

        $this->expectException(\Illuminate\Database\QueryException::class);

        Page::factory()->create(['slug' => 'kontak']);
    }

    public function test_page_belongs_to_updater()
    {
        $user = User::factory()->create();
        $page = Page::factory()->create(['updated_by' => $user->id]);

        $this->assertTrue($page->updatedBy->is($user));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/PageModelTest.php`
Expected: FAIL — class `App\Models\Page` not found.

- [ ] **Step 3: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('title', 200);
            $table->text('content')->nullable();
            $table->string('hero_image', 255)->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pages');
    }
};
```

- [ ] **Step 4: Write the model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Page extends Model
{
    use HasFactory;

    protected $fillable = ['slug', 'title', 'content', 'hero_image', 'updated_by'];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
```

- [ ] **Step 5: Write the factory**

```php
<?php

namespace Database\Factories;

use App\Models\Page;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Page>
 */
class PageFactory extends Factory
{
    protected $model = Page::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slug' => fake()->unique()->slug(2),
            'title' => fake()->sentence(3),
            'content' => '<p>'.fake()->paragraph().'</p>',
            'hero_image' => null,
            'updated_by' => null,
        ];
    }
}
```

- [ ] **Step 6: Run migration and test to verify it passes**

Run: `php artisan migrate && php artisan test --compact tests/Unit/PageModelTest.php`
Expected: PASS (3 tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_08_21_000001_create_pages_table.php app/Models/Page.php database/factories/PageFactory.php tests/Unit/PageModelTest.php
git commit -m "feat: add pages table and model"
```

---

### Task 2: `events` + `event_documentation` tables + models

**Files:**
- Create: `database/migrations/2026_08_21_000002_create_events_table.php`
- Create: `database/migrations/2026_08_21_000003_create_event_documentation_table.php`
- Create: `app/Models/Event.php`
- Create: `app/Models/EventDocumentation.php`
- Create: `database/factories/EventFactory.php`
- Create: `database/factories/EventDocumentationFactory.php`
- Test: `tests/Unit/EventModelTest.php`

**Interfaces:**
- Produces: `App\Models\Event` — fillable `['title', 'slug', 'description', 'starts_at', 'ends_at', 'status', 'is_public', 'created_by']`, casts `starts_at`/`ends_at` to `datetime`, `is_public` to `bool`; relations `createdBy(): BelongsTo` (→ `User`), `documentation(): HasMany` (→ `EventDocumentation`); soft deletes.
- Produces: `App\Models\EventDocumentation` — fillable `['event_id', 'media_type', 'file_path', 'caption']`, `$timestamps = false`; relation `event(): BelongsTo`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\Event;
use App\Models\EventDocumentation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_event_can_be_created()
    {
        $creator = User::factory()->create();
        $event = Event::factory()->create([
            'title' => 'Kerja Bakti',
            'created_by' => $creator->id,
            'status' => 'upcoming',
        ]);

        $this->assertDatabaseHas('events', ['title' => 'Kerja Bakti', 'status' => 'upcoming']);
        $this->assertTrue($event->createdBy->is($creator));
    }

    public function test_event_soft_deletes()
    {
        $event = Event::factory()->create();

        $event->delete();

        $this->assertSoftDeleted($event);
    }

    public function test_event_has_many_documentation()
    {
        $event = Event::factory()->create();
        EventDocumentation::factory()->count(2)->create(['event_id' => $event->id]);

        $this->assertCount(2, $event->documentation);
    }

    public function test_documentation_belongs_to_event()
    {
        $event = Event::factory()->create();
        $doc = EventDocumentation::factory()->create(['event_id' => $event->id, 'media_type' => 'foto']);

        $this->assertTrue($doc->event->is($event));
        $this->assertEquals('foto', $doc->media_type);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/EventModelTest.php`
Expected: FAIL — class `App\Models\Event` not found.

- [ ] **Step 3: Write the events migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title', 200);
            $table->string('slug', 220)->unique()->nullable();
            $table->text('description')->nullable();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->enum('status', ['upcoming', 'ongoing', 'completed'])->default('upcoming');
            $table->boolean('is_public')->default(true);
            $table->foreignId('created_by')->constrained('users');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
```

- [ ] **Step 4: Write the event_documentation migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_documentation', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->enum('media_type', ['foto', 'video']);
            $table->string('file_path', 255);
            $table->string('caption', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_documentation');
    }
};
```

- [ ] **Step 5: Write the models**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Event extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['title', 'slug', 'description', 'starts_at', 'ends_at', 'status', 'is_public', 'created_by'];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'is_public' => 'boolean',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function documentation(): HasMany
    {
        return $this->hasMany(EventDocumentation::class);
    }
}
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventDocumentation extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['event_id', 'media_type', 'file_path', 'caption'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
```

- [ ] **Step 6: Write the factories**

```php
<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    protected $model = Event::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'slug' => fake()->unique()->slug(3),
            'description' => fake()->paragraph(),
            'starts_at' => fake()->dateTimeBetween('now', '+1 month'),
            'ends_at' => null,
            'status' => 'upcoming',
            'is_public' => true,
            'created_by' => User::factory(),
        ];
    }
}
```

```php
<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\EventDocumentation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EventDocumentation>
 */
class EventDocumentationFactory extends Factory
{
    protected $model = EventDocumentation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'media_type' => 'foto',
            'file_path' => 'event-documentation/'.fake()->uuid().'.jpg',
            'caption' => fake()->sentence(),
        ];
    }
}
```

- [ ] **Step 7: Run migrations and test to verify it passes**

Run: `php artisan migrate && php artisan test --compact tests/Unit/EventModelTest.php`
Expected: PASS (4 tests)

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_08_21_000002_create_events_table.php database/migrations/2026_08_21_000003_create_event_documentation_table.php app/Models/Event.php app/Models/EventDocumentation.php database/factories/EventFactory.php database/factories/EventDocumentationFactory.php tests/Unit/EventModelTest.php
git commit -m "feat: add events and event_documentation tables and models"
```

---

### Task 3: `announcements` + `announcement_targets` + `announcement_reads`

**Files:**
- Create: `database/migrations/2026_08_21_000004_create_announcements_table.php`
- Create: `database/migrations/2026_08_21_000005_create_announcement_targets_table.php`
- Create: `database/migrations/2026_08_21_000006_create_announcement_reads_table.php`
- Create: `app/Models/Announcement.php`
- Create: `app/Models/AnnouncementTarget.php`
- Create: `app/Models/AnnouncementRead.php`
- Create: `database/factories/AnnouncementFactory.php`
- Create: `database/factories/AnnouncementTargetFactory.php`
- Create: `database/factories/AnnouncementReadFactory.php`
- Test: `tests/Unit/AnnouncementModelTest.php`

**Interfaces:**
- Produces: `App\Models\Announcement` — fillable `['title', 'slug', 'content', 'category', 'is_public', 'published_at', 'created_by']`, casts `is_public` bool, `published_at` datetime; relations `createdBy(): BelongsTo`, `targets(): HasMany`, `reads(): HasMany`; soft deletes.
- Produces: `App\Models\AnnouncementTarget` — fillable `['announcement_id', 'house_id']`, `$timestamps = false`; relations `announcement(): BelongsTo`, `house(): BelongsTo`.
- Produces: `App\Models\AnnouncementRead` — fillable `['announcement_id', 'user_id', 'read_at']`, `$timestamps = false`, cast `read_at` datetime; relations `announcement(): BelongsTo`, `user(): BelongsTo`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\AnnouncementTarget;
use App\Models\House;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_announcement_can_be_created_with_category()
    {
        $announcement = Announcement::factory()->create(['category' => 'darurat', 'is_public' => true]);

        $this->assertDatabaseHas('announcements', ['category' => 'darurat', 'is_public' => true]);
    }

    public function test_announcement_has_many_targets()
    {
        $announcement = Announcement::factory()->create();
        $house = House::factory()->create();
        AnnouncementTarget::factory()->create(['announcement_id' => $announcement->id, 'house_id' => $house->id]);

        $this->assertCount(1, $announcement->targets);
        $this->assertTrue($announcement->targets->first()->house->is($house));
    }

    public function test_announcement_read_is_unique_per_user()
    {
        $announcement = Announcement::factory()->create();
        $user = User::factory()->create();
        AnnouncementRead::factory()->create(['announcement_id' => $announcement->id, 'user_id' => $user->id]);

        $this->expectException(QueryException::class);

        AnnouncementRead::factory()->create(['announcement_id' => $announcement->id, 'user_id' => $user->id]);
    }

    public function test_announcement_soft_deletes()
    {
        $announcement = Announcement::factory()->create();

        $announcement->delete();

        $this->assertSoftDeleted($announcement);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/AnnouncementModelTest.php`
Expected: FAIL — class `App\Models\Announcement` not found.

- [ ] **Step 3: Write the migrations**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title', 200);
            $table->string('slug', 220)->unique()->nullable();
            $table->text('content');
            $table->enum('category', ['darurat', 'umum', 'kegiatan', 'keuangan']);
            $table->boolean('is_public')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
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
        Schema::create('announcement_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('announcement_id')->constrained('announcements')->cascadeOnDelete();
            $table->foreignId('house_id')->nullable()->constrained('houses')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_targets');
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
        Schema::create('announcement_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('announcement_id')->constrained('announcements')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('read_at');
            $table->unique(['announcement_id', 'user_id'], 'announcement_reads_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_reads');
    }
};
```

- [ ] **Step 4: Write the models**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Announcement extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['title', 'slug', 'content', 'category', 'is_public', 'published_at', 'created_by'];

    protected $casts = [
        'is_public' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function targets(): HasMany
    {
        return $this->hasMany(AnnouncementTarget::class);
    }

    public function reads(): HasMany
    {
        return $this->hasMany(AnnouncementRead::class);
    }
}
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnouncementTarget extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['announcement_id', 'house_id'];

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    public function house(): BelongsTo
    {
        return $this->belongsTo(House::class);
    }
}
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnouncementRead extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['announcement_id', 'user_id', 'read_at'];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 5: Write the factories**

```php
<?php

namespace Database\Factories;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Announcement>
 */
class AnnouncementFactory extends Factory
{
    protected $model = Announcement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'slug' => fake()->unique()->slug(3),
            'content' => '<p>'.fake()->paragraph().'</p>',
            'category' => fake()->randomElement(['darurat', 'umum', 'kegiatan', 'keuangan']),
            'is_public' => false,
            'published_at' => now(),
            'created_by' => User::factory(),
        ];
    }
}
```

```php
<?php

namespace Database\Factories;

use App\Models\Announcement;
use App\Models\AnnouncementTarget;
use App\Models\House;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AnnouncementTarget>
 */
class AnnouncementTargetFactory extends Factory
{
    protected $model = AnnouncementTarget::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'announcement_id' => Announcement::factory(),
            'house_id' => House::factory(),
        ];
    }
}
```

```php
<?php

namespace Database\Factories;

use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AnnouncementRead>
 */
class AnnouncementReadFactory extends Factory
{
    protected $model = AnnouncementRead::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'announcement_id' => Announcement::factory(),
            'user_id' => User::factory(),
            'read_at' => now(),
        ];
    }
}
```

- [ ] **Step 6: Run migrations and test to verify it passes**

Run: `php artisan migrate && php artisan test --compact tests/Unit/AnnouncementModelTest.php`
Expected: PASS (4 tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_08_21_000004_create_announcements_table.php database/migrations/2026_08_21_000005_create_announcement_targets_table.php database/migrations/2026_08_21_000006_create_announcement_reads_table.php app/Models/Announcement.php app/Models/AnnouncementTarget.php app/Models/AnnouncementRead.php database/factories/AnnouncementFactory.php database/factories/AnnouncementTargetFactory.php database/factories/AnnouncementReadFactory.php tests/Unit/AnnouncementModelTest.php
git commit -m "feat: add announcements, announcement_targets, announcement_reads tables and models"
```

---

### Task 4: `polls` + `poll_options` + `poll_votes`

**Files:**
- Create: `database/migrations/2026_08_21_000007_create_polls_table.php`
- Create: `database/migrations/2026_08_21_000008_create_poll_options_table.php`
- Create: `database/migrations/2026_08_21_000009_create_poll_votes_table.php`
- Create: `app/Models/Poll.php`
- Create: `app/Models/PollOption.php`
- Create: `app/Models/PollVote.php`
- Create: `database/factories/PollFactory.php`
- Create: `database/factories/PollOptionFactory.php`
- Create: `database/factories/PollVoteFactory.php`
- Test: `tests/Unit/PollModelTest.php`

**Interfaces:**
- Produces: `App\Models\Poll` — fillable `['title', 'description', 'created_by', 'starts_at', 'ends_at']`, `$timestamps = false`, casts `starts_at`/`ends_at` datetime; relations `createdBy(): BelongsTo`, `options(): HasMany`, `votes(): HasMany`.
- Produces: `App\Models\PollOption` — fillable `['poll_id', 'label']`, `$timestamps = false`; relations `poll(): BelongsTo`, `votes(): HasMany`.
- Produces: `App\Models\PollVote` — fillable `['poll_id', 'option_id', 'user_id', 'voted_at']`, `$timestamps = false`, cast `voted_at` datetime; relations `poll(): BelongsTo`, `option(): BelongsTo`, `user(): BelongsTo`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PollModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_poll_has_many_options()
    {
        $poll = Poll::factory()->create();
        PollOption::factory()->count(3)->create(['poll_id' => $poll->id]);

        $this->assertCount(3, $poll->options);
    }

    public function test_user_can_vote_once_per_poll()
    {
        $poll = Poll::factory()->create();
        $option = PollOption::factory()->create(['poll_id' => $poll->id]);
        $user = User::factory()->create();

        PollVote::factory()->create(['poll_id' => $poll->id, 'option_id' => $option->id, 'user_id' => $user->id]);

        $this->expectException(QueryException::class);

        PollVote::factory()->create(['poll_id' => $poll->id, 'option_id' => $option->id, 'user_id' => $user->id]);
    }

    public function test_vote_belongs_to_option_and_poll()
    {
        $poll = Poll::factory()->create();
        $option = PollOption::factory()->create(['poll_id' => $poll->id]);
        $vote = PollVote::factory()->create(['poll_id' => $poll->id, 'option_id' => $option->id]);

        $this->assertTrue($vote->poll->is($poll));
        $this->assertTrue($vote->option->is($option));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/PollModelTest.php`
Expected: FAIL — class `App\Models\Poll` not found.

- [ ] **Step 3: Write the migrations**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('polls', function (Blueprint $table) {
            $table->id();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('polls');
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
        Schema::create('poll_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('poll_id')->constrained('polls')->cascadeOnDelete();
            $table->string('label', 150);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poll_options');
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
        Schema::create('poll_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('poll_id')->constrained('polls')->cascadeOnDelete();
            $table->foreignId('option_id')->constrained('poll_options')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('voted_at');
            $table->unique(['poll_id', 'user_id'], 'poll_votes_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poll_votes');
    }
};
```

- [ ] **Step 4: Write the models**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Poll extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['title', 'description', 'created_by', 'starts_at', 'ends_at'];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function options(): HasMany
    {
        return $this->hasMany(PollOption::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(PollVote::class);
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

class PollOption extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['poll_id', 'label'];

    public function poll(): BelongsTo
    {
        return $this->belongsTo(Poll::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(PollVote::class, 'option_id');
    }
}
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PollVote extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['poll_id', 'option_id', 'user_id', 'voted_at'];

    protected $casts = [
        'voted_at' => 'datetime',
    ];

    public function poll(): BelongsTo
    {
        return $this->belongsTo(Poll::class);
    }

    public function option(): BelongsTo
    {
        return $this->belongsTo(PollOption::class, 'option_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 5: Write the factories**

```php
<?php

namespace Database\Factories;

use App\Models\Poll;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Poll>
 */
class PollFactory extends Factory
{
    protected $model = Poll::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'created_by' => User::factory(),
            'starts_at' => now(),
            'ends_at' => now()->addWeek(),
        ];
    }
}
```

```php
<?php

namespace Database\Factories;

use App\Models\Poll;
use App\Models\PollOption;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PollOption>
 */
class PollOptionFactory extends Factory
{
    protected $model = PollOption::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'poll_id' => Poll::factory(),
            'label' => fake()->words(2, true),
        ];
    }
}
```

```php
<?php

namespace Database\Factories;

use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PollVote>
 */
class PollVoteFactory extends Factory
{
    protected $model = PollVote::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'poll_id' => Poll::factory(),
            'option_id' => PollOption::factory(),
            'user_id' => User::factory(),
            'voted_at' => now(),
        ];
    }
}
```

- [ ] **Step 6: Run migrations and test to verify it passes**

Run: `php artisan migrate && php artisan test --compact tests/Unit/PollModelTest.php`
Expected: PASS (3 tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_08_21_000007_create_polls_table.php database/migrations/2026_08_21_000008_create_poll_options_table.php database/migrations/2026_08_21_000009_create_poll_votes_table.php app/Models/Poll.php app/Models/PollOption.php app/Models/PollVote.php database/factories/PollFactory.php database/factories/PollOptionFactory.php database/factories/PollVoteFactory.php tests/Unit/PollModelTest.php
git commit -m "feat: add polls, poll_options, poll_votes tables and models"
```

---

### Task 5: `forum_threads` + `forum_posts`

**Files:**
- Create: `database/migrations/2026_08_21_000010_create_forum_threads_table.php`
- Create: `database/migrations/2026_08_21_000011_create_forum_posts_table.php`
- Create: `app/Models/ForumThread.php`
- Create: `app/Models/ForumPost.php`
- Create: `database/factories/ForumThreadFactory.php`
- Create: `database/factories/ForumPostFactory.php`
- Test: `tests/Unit/ForumModelTest.php`

**Interfaces:**
- Produces: `App\Models\ForumThread` — fillable `['title', 'created_by']`, relations `createdBy(): BelongsTo`, `posts(): HasMany`; soft deletes, full timestamps.
- Produces: `App\Models\ForumPost` — fillable `['thread_id', 'user_id', 'content']`, `$timestamps = false`, soft deletes; relations `thread(): BelongsTo`, `user(): BelongsTo`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ForumModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_thread_has_many_posts()
    {
        $thread = ForumThread::factory()->create();
        ForumPost::factory()->count(2)->create(['thread_id' => $thread->id]);

        $this->assertCount(2, $thread->posts);
    }

    public function test_post_belongs_to_user()
    {
        $user = User::factory()->create();
        $post = ForumPost::factory()->create(['user_id' => $user->id]);

        $this->assertTrue($post->user->is($user));
    }

    public function test_thread_soft_deletes()
    {
        $thread = ForumThread::factory()->create();

        $thread->delete();

        $this->assertSoftDeleted($thread);
    }

    public function test_post_soft_deletes()
    {
        $post = ForumPost::factory()->create();

        $post->delete();

        $this->assertSoftDeleted($post);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/ForumModelTest.php`
Expected: FAIL — class `App\Models\ForumThread` not found.

- [ ] **Step 3: Write the migrations**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('forum_threads', function (Blueprint $table) {
            $table->id();
            $table->string('title', 200);
            $table->foreignId('created_by')->constrained('users');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forum_threads');
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
        Schema::create('forum_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('thread_id')->constrained('forum_threads')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->text('content');
            $table->timestamp('created_at')->useCurrent();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forum_posts');
    }
};
```

- [ ] **Step 4: Write the models**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ForumThread extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['title', 'created_by'];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function posts(): HasMany
    {
        return $this->hasMany(ForumPost::class, 'thread_id');
    }
}
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ForumPost extends Model
{
    use HasFactory, SoftDeletes;

    public $timestamps = false;

    protected $fillable = ['thread_id', 'user_id', 'content'];

    public function thread(): BelongsTo
    {
        return $this->belongsTo(ForumThread::class, 'thread_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 5: Write the factories**

```php
<?php

namespace Database\Factories;

use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ForumThread>
 */
class ForumThreadFactory extends Factory
{
    protected $model = ForumThread::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'created_by' => User::factory(),
        ];
    }
}
```

```php
<?php

namespace Database\Factories;

use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ForumPost>
 */
class ForumPostFactory extends Factory
{
    protected $model = ForumPost::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'thread_id' => ForumThread::factory(),
            'user_id' => User::factory(),
            'content' => fake()->paragraph(),
        ];
    }
}
```

- [ ] **Step 6: Run migrations and test to verify it passes**

Run: `php artisan migrate && php artisan test --compact tests/Unit/ForumModelTest.php`
Expected: PASS (4 tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_08_21_000010_create_forum_threads_table.php database/migrations/2026_08_21_000011_create_forum_posts_table.php app/Models/ForumThread.php app/Models/ForumPost.php database/factories/ForumThreadFactory.php database/factories/ForumPostFactory.php tests/Unit/ForumModelTest.php
git commit -m "feat: add forum_threads and forum_posts tables and models"
```

---

### Task 6: `contact_messages` table + model

**Files:**
- Create: `database/migrations/2026_08_21_000012_create_contact_messages_table.php`
- Create: `app/Models/ContactMessage.php`
- Create: `database/factories/ContactMessageFactory.php`
- Test: `tests/Unit/ContactMessageModelTest.php`

**Interfaces:**
- Produces: `App\Models\ContactMessage` — fillable `['name', 'email', 'phone', 'message', 'status']`, default `status` = `new`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\ContactMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactMessageModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_message_defaults_to_new_status()
    {
        $message = ContactMessage::factory()->create();

        $this->assertEquals('new', $message->status);
    }

    public function test_contact_message_can_be_marked_read()
    {
        $message = ContactMessage::factory()->create(['status' => 'new']);

        $message->update(['status' => 'read']);

        $this->assertDatabaseHas('contact_messages', ['id' => $message->id, 'status' => 'read']);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/ContactMessageModelTest.php`
Expected: FAIL — class `App\Models\ContactMessage` not found.

- [ ] **Step 3: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('email', 150)->nullable();
            $table->string('phone', 20)->nullable();
            $table->text('message');
            $table->enum('status', ['new', 'read'])->default('new');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_messages');
    }
};
```

- [ ] **Step 4: Write the model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'email', 'phone', 'message', 'status'];
}
```

- [ ] **Step 5: Write the factory**

```php
<?php

namespace Database\Factories;

use App\Models\ContactMessage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContactMessage>
 */
class ContactMessageFactory extends Factory
{
    protected $model = ContactMessage::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'message' => fake()->paragraph(),
            'status' => 'new',
        ];
    }
}
```

- [ ] **Step 6: Run migration and test to verify it passes**

Run: `php artisan migrate && php artisan test --compact tests/Unit/ContactMessageModelTest.php`
Expected: PASS (2 tests)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_08_21_000012_create_contact_messages_table.php app/Models/ContactMessage.php database/factories/ContactMessageFactory.php tests/Unit/ContactMessageModelTest.php
git commit -m "feat: add contact_messages table and model"
```

---

### Task 7: `HtmlSanitizer` service

**Files:**
- Modify: `composer.json` (add `mews/purifier`)
- Create: `app/Services/HtmlSanitizer.php`
- Test: `tests/Unit/HtmlSanitizerTest.php`

**Interfaces:**
- Consumes: none.
- Produces: `App\Services\HtmlSanitizer::sanitize(string $html): string` — strips `<script>` tags and event-handler attributes, keeps basic formatting tags (`p`, `strong`, `em`, `a`, `h1`-`h4`, `ul`, `ol`, `li`, `img`, `blockquote`). Used by Plan C (announcements) and Plan B (pages) before persisting rich-text content from Tiptap.

- [ ] **Step 1: Add the dependency**

```bash
composer require mews/purifier
php artisan vendor:publish --provider="Mews\Purifier\PurifierServiceProvider"
```

This publishes `config/purifier.php`.

- [ ] **Step 2: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Services\HtmlSanitizer;
use Tests\TestCase;

class HtmlSanitizerTest extends TestCase
{
    public function test_strips_script_tags()
    {
        $result = (new HtmlSanitizer)->sanitize('<p>Hello</p><script>alert("xss")</script>');

        $this->assertStringNotContainsString('<script>', $result);
        $this->assertStringContainsString('<p>Hello</p>', $result);
    }

    public function test_strips_event_handler_attributes()
    {
        $result = (new HtmlSanitizer)->sanitize('<p onclick="alert(1)">Click</p>');

        $this->assertStringNotContainsString('onclick', $result);
    }

    public function test_keeps_basic_formatting_tags()
    {
        $result = (new HtmlSanitizer)->sanitize('<h2>Judul</h2><p><strong>Tebal</strong> dan <em>miring</em></p><ul><li>Satu</li></ul>');

        $this->assertStringContainsString('<h2>', $result);
        $this->assertStringContainsString('<strong>', $result);
        $this->assertStringContainsString('<em>', $result);
        $this->assertStringContainsString('<li>', $result);
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/HtmlSanitizerTest.php`
Expected: FAIL — class `App\Services\HtmlSanitizer` not found.

- [ ] **Step 4: Write the service**

```php
<?php

namespace App\Services;

use Mews\Purifier\Facades\Purifier;

class HtmlSanitizer
{
    public function sanitize(string $html): string
    {
        return Purifier::clean($html, [
            'HTML.Allowed' => 'p,br,strong,em,a[href],h1,h2,h3,h4,ul,ol,li,img[src|alt],blockquote',
        ]);
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test --compact tests/Unit/HtmlSanitizerTest.php`
Expected: PASS (3 tests)

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add composer.json composer.lock config/purifier.php app/Services/HtmlSanitizer.php tests/Unit/HtmlSanitizerTest.php
git commit -m "feat: add HtmlSanitizer service for rich-text content"
```

---

### Task 8: `WahaService` (WhatsApp broadcast client)

**Files:**
- Modify: `config/services.php` (add `waha` block)
- Modify: `.env.example` (add `WAHA_BASE_URL`, `WAHA_SESSION`, `WAHA_API_KEY`)
- Create: `app/Services/WahaService.php`
- Test: `tests/Unit/WahaServiceTest.php`

**Interfaces:**
- Consumes: `config('services.waha.base_url')`, `config('services.waha.session')`, `config('services.waha.api_key')`.
- Produces: `App\Services\WahaService::sendMessage(string $phoneNumber, string $message): bool` — `$phoneNumber` is a local Indonesian number (e.g. `081234567890`); the service normalizes it to WAHA's `chatId` format (`62xxxxxxxxxx@c.us`). Used by Plan C's `SendAnnouncementWhatsappJob`.

- [ ] **Step 1: Add config**

In `config/services.php`, add after the `slack` block:

```php
    'waha' => [
        'base_url' => env('WAHA_BASE_URL', 'http://localhost:3000'),
        'session' => env('WAHA_SESSION', 'default'),
        'api_key' => env('WAHA_API_KEY'),
    ],
```

In `.env.example`, add after the `AWS_*` block:

```
WAHA_BASE_URL=http://localhost:3000
WAHA_SESSION=default
WAHA_API_KEY=
```

- [ ] **Step 2: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Services\WahaService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WahaServiceTest extends TestCase
{
    public function test_sends_message_and_returns_true_on_success()
    {
        Http::fake([
            '*/api/sendText' => Http::response(['id' => 'msg-1'], 200),
        ]);

        $result = (new WahaService)->sendMessage('081234567890', 'Pengumuman baru');

        $this->assertTrue($result);
        Http::assertSent(function ($request) {
            return $request['chatId'] === '6281234567890@c.us'
                && $request['text'] === 'Pengumuman baru';
        });
    }

    public function test_returns_false_on_failure_response()
    {
        Http::fake([
            '*/api/sendText' => Http::response(['error' => 'session not found'], 422),
        ]);

        $result = (new WahaService)->sendMessage('081234567890', 'Pengumuman baru');

        $this->assertFalse($result);
    }

    public function test_normalizes_local_prefix_to_country_code()
    {
        Http::fake([
            '*/api/sendText' => Http::response(['id' => 'msg-1'], 200),
        ]);

        (new WahaService)->sendMessage('0812-3456-7890', 'Test');

        Http::assertSent(fn ($request) => $request['chatId'] === '6281234567890@c.us');
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/WahaServiceTest.php`
Expected: FAIL — class `App\Services\WahaService` not found.

- [ ] **Step 4: Write the service**

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WahaService
{
    public function sendMessage(string $phoneNumber, string $message): bool
    {
        $response = Http::withHeaders([
            'X-Api-Key' => config('services.waha.api_key'),
        ])->post(rtrim(config('services.waha.base_url'), '/').'/api/sendText', [
            'session' => config('services.waha.session'),
            'chatId' => $this->toChatId($phoneNumber),
            'text' => $message,
        ]);

        return $response->successful();
    }

    private function toChatId(string $phoneNumber): string
    {
        $digits = preg_replace('/\D/', '', $phoneNumber);

        if (str_starts_with($digits, '0')) {
            $digits = '62'.substr($digits, 1);
        }

        return $digits.'@c.us';
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test --compact tests/Unit/WahaServiceTest.php`
Expected: PASS (3 tests)

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add config/services.php .env.example app/Services/WahaService.php tests/Unit/WahaServiceTest.php
git commit -m "feat: add WahaService for WhatsApp broadcast via WAHA"
```

---

### Task 9: Queue worker infrastructure

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker/supervisord.conf`

**Interfaces:**
- Consumes: `App\Services\WahaService` and any job dispatched to the `database` queue connection (already configured via `QUEUE_CONNECTION=database` in both compose files).
- Produces: a running `queue:work` process in both dev (dedicated `queue` service) and prod (supervised program inside the `backend` container) — required before Plan C's `SendAnnouncementWhatsappJob` can be dispatched and processed.

There is no automated test for infra changes in this repo; verification is `docker compose config -q` (validates YAML/interpolation) plus a manual `docker compose up` smoke check, which is called out as a manual step below.

- [ ] **Step 1: Add a `queue` service to `docker-compose.yml`**

In `docker-compose.yml`, add a new service after `backend` (reusing the same build context and environment, only the command differs):

```yaml
  queue:
    build:
      context: ./src/backend
      dockerfile: Dockerfile
    image: siwarga-backend:dev
    restart: unless-stopped
    command: ['php', 'artisan', 'queue:work', '--tries=3', '--sleep=3']
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
      WAHA_BASE_URL: ${WAHA_BASE_URL:-http://waha:3000}
      WAHA_SESSION: ${WAHA_SESSION:-default}
      WAHA_API_KEY: ${WAHA_API_KEY:-}
    volumes:
      - ./src/backend:/var/www/html
      - siwarga_backend_vendor:/var/www/html/vendor
    depends_on:
      db:
        condition: service_healthy
```

- [ ] **Step 2: Add a `queue-worker` program to `docker/supervisord.conf`**

Append to `docker/supervisord.conf`:

```ini
[program:queue-worker]
command=php artisan queue:work --tries=3 --sleep=3
directory=/var/www/html
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=true
```

- [ ] **Step 3: Validate compose syntax**

Run: `docker compose config -q`
Expected: exits 0, no output (confirms the new `queue` service parses correctly and env interpolation resolves).

- [ ] **Step 4: Manual smoke check (not automatable — record the result in the commit body)**

Run: `docker compose up -d db backend queue && docker compose logs queue --tail=20`
Expected: log shows `Processing jobs from the [default] queue` (or equivalent "waiting for jobs" output) with no fatal errors, confirming the worker connects to the DB-backed queue.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml docker/supervisord.conf
git commit -m "feat: add queue worker service (dev) and supervised program (prod)"
```

---

### Task 10: WAHA infrastructure

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prd.yml`

**Interfaces:**
- Produces: a running WAHA container reachable at `http://waha:3000` from other services on the compose network, backing `App\Services\WahaService` (Task 8) once `WAHA_BASE_URL` is pointed at it.

Source for image, volume path, and env vars: [WAHA Storages docs](https://waha.devlike.pro/docs/how-to/storages/), [WAHA docker-compose.yaml](https://github.com/devlikeapro/whatsapp-http-api/blob/core/docker-compose.yaml), [WAHA Configuration docs](https://waha.devlike.pro/docs/how-to/config/).

- [ ] **Step 1: Add `waha` service to `docker-compose.yml` (dev)**

```yaml
  waha:
    image: devlikeapro/waha:latest
    restart: unless-stopped
    ports:
      - '${WAHA_PORT:-3000}:3000'
    environment:
      WHATSAPP_API_KEY: ${WAHA_API_KEY:-}
      WAHA_DASHBOARD_ENABLED: 'true'
      WAHA_DASHBOARD_USERNAME: ${WAHA_DASHBOARD_USERNAME:-admin}
      WAHA_DASHBOARD_PASSWORD: ${WAHA_DASHBOARD_PASSWORD:-secret}
      WAHA_PRINT_QR: 'true'
    volumes:
      - siwarga_waha_sessions:/app/.sessions
      - siwarga_waha_media:/app/.media
```

Add the two new volumes to the `volumes:` block at the bottom of the file:

```yaml
  siwarga_waha_sessions:
  siwarga_waha_media:
```

- [ ] **Step 2: Add `waha` service to `docker-compose.prd.yml`**

```yaml
  waha:
    image: devlikeapro/waha:latest
    restart: unless-stopped
    ports:
      - '${WAHA_PORT:-3000}:3000'
    environment:
      WHATSAPP_API_KEY: ${WAHA_API_KEY:?WAHA_API_KEY wajib di-set di .env untuk production}
      WAHA_DASHBOARD_ENABLED: 'true'
      WAHA_DASHBOARD_USERNAME: ${WAHA_DASHBOARD_USERNAME:?WAHA_DASHBOARD_USERNAME wajib di-set}
      WAHA_DASHBOARD_PASSWORD: ${WAHA_DASHBOARD_PASSWORD:?WAHA_DASHBOARD_PASSWORD wajib di-set}
      WAHA_PRINT_QR: 'false'
    volumes:
      - siwarga_waha_sessions_prd:/app/.sessions
      - siwarga_waha_media_prd:/app/.media
```

Add to the `volumes:` block:

```yaml
  siwarga_waha_sessions_prd:
  siwarga_waha_media_prd:
```

- [ ] **Step 3: Validate compose syntax for both files**

Run: `docker compose config -q && docker compose -f docker-compose.prd.yml config -q`
Expected: both exit 0 with no output.

- [ ] **Step 4: Manual smoke check + one-time QR scan (not automatable — this is an operational step, document it in README as part of this commit)**

Run: `docker compose up -d waha`, then open `http://localhost:3000` in a browser, log in with `WAHA_DASHBOARD_USERNAME`/`WAHA_DASHBOARD_PASSWORD`, start the default session, and scan the QR code with the RT's WhatsApp number. Confirm the session shows `WORKING` status in the dashboard.

Add a short note to the repo's setup docs (wherever Docker setup is currently documented, e.g. `README.md`) under a new "WAHA (WhatsApp Gateway)" subsection: this manual QR-scan step must be repeated whenever the `waha` volume is reset, and the session number must stay active on a phone or it will be logged out (per the risk noted in `docs/PRD-v2.md` §6).

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml docker-compose.prd.yml README.md
git commit -m "feat: add WAHA service for WhatsApp broadcast infrastructure"
```

---

## Plan Self-Review Notes

- **Spec coverage:** §2 Data Model → Tasks 1–6. §3.3 WA broadcast → Task 8 (service) + Task 9 (worker to run the job Plan C will add) + Task 10 (WAHA container). §3.4 rich text sanitization → Task 7. §6 Infra & queue worker → Tasks 9–10. Route/controller/policy/gate work from §3.1–3.2 and all frontend/Astro work (§4–§5) is explicitly out of scope for Plan A — it belongs to Plans B–F.
- **Deviations from ERD-v2 called out explicitly:** `events.facility_booking_id` omitted (depends on out-of-scope table); reduced timestamp columns on several tables kept faithful to the ERD instead of the app's usual `timestamps()+softDeletes()` default — see Global Constraints.
- **`contact_messages`** is new (not in ERD-v2), as agreed in the spec §2.
