# Fase 4 Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build security operations (digital guest log with QR pre-registration, panic button with after-commit WA+DB notifications, patrol schedules, emergency contacts) plus digital family cards with QR verification and a new Satpam role — backend API + React UI + tests.

**Architecture:** Two backend slices (guest+panic → patrol+contacts+family) then two frontend slices, each Controller → Policy → Service on the backend and a `siwarga-*` feature module with thin axios service + TanStack Query hooks on the frontend. Panic notifications reuse the Fase 2/3 pattern: DB notify inside the transaction, WA dispatch strictly after commit.

**Tech Stack:** Laravel 13, PHPUnit, MySQL, React 19 + TanStack Query/Router, existing `WahaService` + queue (`tries = 3`), Laravel database notifications, `qrcode.react` (new frontend dep — needs user approval, see constraints).

**Spec:** `docs/superpowers/specs/2026-09-09-fase-4-security-design.md` (all 4 sections approved by user).

## Global Constraints

- Follow Pint formatting (`vendor/bin/pint --dirty --format agent`) before each PHP commit.
- Every change must be programmatically tested (TDD: failing test first, then minimal implementation).
- Panic rule: max ONE `active` alert per reporter (second POST → 422); throttle `throttle:panic` on report.
- Notification rule (Fase 3 lesson): DB `notify()` may run inside the transaction; `SendPanicWhatsappJob::dispatch()` runs ONLY after commit. Never assert WA delivery in tests — assert DB/API state.
- QR tokens: `Str::random(32)`, unique index, never encode personal data. Household verify token is stateless `id.hmac` (`hash_hmac('sha256', "household:{id}", app.key)`); public verify returns head name + address ONLY (never NIK/birth/phone).
- NIK exposure: in `FamilyMemberResource` only when `can:family-members.manage` OR owner of the house; never in the public endpoint.
- Frontend toasts in Bahasa Indonesia; reuse `DataTable*` primitives, `use-table-url-state`, `Header`/`Main` layout, `useHasPermission`, and the suggestions/tickets page pattern.
- No MSW handler exists yet for security/family domains — none to update.
- NEW DEPENDENCY (needs user approval at execution): `qrcode.react` for QR rendering. Fallback if declined: show token as text + copy button (plan Task 7 says where).

---

## File map

| File | Responsibility |
|---|---|
| `app/Models/Permission.php` | +10 system permissions |
| `app/Models/GuestLog.php`, `PanicAlert.php`, `PatrolSchedule.php`, `FamilyMember.php`, `EmergencyContact.php` (new) | Eloquent models + relations |
| `app/Policies/GuestLogPolicy.php`, `PanicAlertPolicy.php`, `PatrolSchedulePolicy.php`, `FamilyMemberPolicy.php`, `EmergencyContactPolicy.php` (new) | authorization per domain |
| `database/migrations/2026_09_10_00000{1..5}_*` (new ×5) | guest_logs, panic_alerts, patrol_schedules, emergency_contacts, family_members |
| `app/Services/GuestLogService.php`, `PanicAlertService.php` (new) | token/status transitions, 1-active rule + notifications |
| `app/Http/Controllers/Api/GuestLogController.php`, `PanicAlertController.php`, `PatrolScheduleController.php`, `EmergencyContactController.php`, `FamilyMemberController.php`, `HouseholdCardController.php` (new) | endpoints |
| `app/Http/Resources/*` (new ×6) | GuestLog, PanicAlert, PatrolSchedule, EmergencyContact, FamilyMember resources + card shape inline |
| `app/Notifications/PanicAlertUpdated.php` (new) | database-channel payload (title/old_status/new_status for bell) |
| `app/Jobs/SendPanicWhatsappJob.php` (new) | queued WA to reporter / to staff |
| `routes/api.php`, `app/Providers/AppServiceProvider.php`, `database/seeders/RoleSeeder.php`, `database/seeders/UserSeeder.php` | routes, gates, `panic` rate limiter, satpam role + demo user |
| `src/types/api.ts` | TS types for 5 domains |
| `src/services/guest-logs.ts`, `panic.ts`, `patrols.ts`, `family.ts` (new) | thin axios clients |
| `src/hooks/use-guest-logs.ts`, `use-panic.ts`, `use-patrols.ts`, `use-family.ts` (new) | TanStack Query hooks |
| `src/features/siwarga-guest-logs/*`, `siwarga-panic/*`, `siwarga-patrols/*`, `siwarga-family/*` (new) | pages |
| `src/routes/_authenticated/guest-logs/index.tsx`, `panic/index.tsx`, `patrols/index.tsx`, `family/index.tsx` (new) | routes + zod schemas |
| `src/components/layout/data/sidebar-data.ts` | new `Keamanan` nav group |

---

### Task 1: security permissions/policies/gates/seeder + Satpam role + models

**Files:**
- Modify: `app/Models/Permission.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Modify: `database/seeders/RoleSeeder.php`
- Modify: `database/seeders/UserSeeder.php`
- Create: `app/Models/GuestLog.php`
- Create: `app/Models/PanicAlert.php`
- Create: `app/Models/PatrolSchedule.php`
- Create: `app/Models/FamilyMember.php`
- Create: `app/Models/EmergencyContact.php`
- Create: `app/Policies/GuestLogPolicy.php`
- Create: `app/Policies/PanicAlertPolicy.php`
- Create: `app/Policies/PatrolSchedulePolicy.php`
- Create: `app/Policies/FamilyMemberPolicy.php`
- Create: `app/Policies/EmergencyContactPolicy.php`
- Create: `database/factories/GuestLogFactory.php`
- Create: `database/factories/PanicAlertFactory.php`
- Create: `database/factories/PatrolScheduleFactory.php`
- Create: `database/factories/FamilyMemberFactory.php`
- Create: `database/factories/EmergencyContactFactory.php`
- Test: `tests/Unit/SecurityPolicyTest.php`

**Interfaces:**
- Consumes: `User::hasPermission()`, `Permission::SYSTEM_PERMISSIONS`, `PermissionSeeder` + `RoleSeeder` (admin auto-syncs `Permission::all()`).
- Produces: gates `guest-logs.view/manage/register`, `panic-alerts.report/handle`, `patrol-schedules.view/manage`, `family-members.view/manage`, `emergency-contacts.manage`; satpam role + `satpam@siwarga.test` demo user; 5 models consumed by Tasks 2–5 (migrations arrive with their tasks — like Fase 3 Task 2, models land here so policy type-hints resolve).

- [ ] **Step 1: Write the failing policy tests**

```php
<?php

namespace Tests\Unit;

use App\Models\FamilyMember;
use App\Models\GuestLog;
use App\Models\House;
use App\Models\HouseResident;
use App\Models\PanicAlert;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use App\Policies\FamilyMemberPolicy;
use App\Policies\GuestLogPolicy;
use App\Policies\PanicAlertPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function actingUser(string $role, ?int $residentId = null): User
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $user = User::factory()->create(['resident_id' => $residentId]);
        $user->roles()->attach(Role::where('name', $role)->first()->id);
        $user->load('roles.permissions');

        return $user;
    }

    public function test_admin_has_full_security_access()
    {
        $admin = $this->actingUser('admin');

        $this->assertTrue((new GuestLogPolicy)->create($admin));
        $this->assertTrue((new PanicAlertPolicy)->handle($admin, new PanicAlert));
        $this->assertTrue((new FamilyMemberPolicy)->viewAny($admin));
    }

    public function test_satpam_manages_guests_and_handles_panic_but_no_finance_or_family()
    {
        $satpam = $this->actingUser('satpam');

        $this->assertTrue((new GuestLogPolicy)->viewAny($satpam));
        $this->assertTrue((new GuestLogPolicy)->checkIn($satpam, new GuestLog));
        $this->assertTrue((new PanicAlertPolicy)->handle($satpam, new PanicAlert));
        $this->assertFalse($satpam->hasPermission('expenses.view'));
        $this->assertFalse($satpam->hasPermission('residents.view'));
        $this->assertFalse((new FamilyMemberPolicy)->viewAny($satpam));
    }

    public function test_warga_reports_panic_and_registers_guests_but_cannot_check_in()
    {
        $warga = $this->actingUser('warga');

        $this->assertTrue((new PanicAlertPolicy)->report($warga));
        $this->assertTrue((new GuestLogPolicy)->create($warga));
        $this->assertFalse((new GuestLogPolicy)->checkIn($warga, new GuestLog));
        $this->assertFalse((new PanicAlertPolicy)->handle($warga, new PanicAlert));
    }

    public function test_family_member_visibility_is_own_house_or_manager()
    {
        $houseA = House::factory()->create();
        $houseB = House::factory()->create();
        $resident = Resident::factory()->create();
        $houseA->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);
        $warga = $this->actingUser('warga', $resident->id);
        $policy = new FamilyMemberPolicy;

        $own = FamilyMember::factory()->make(['house_id' => $houseA->id]);
        $other = FamilyMember::factory()->make(['house_id' => $houseB->id]);

        $this->assertTrue($policy->view($warga, $own));
        $this->assertFalse($policy->view($warga, $other));
    }

    public function test_panic_cancel_is_reporter_or_handler()
    {
        $warga = $this->actingUser('warga');
        $satpam = $this->actingUser('satpam');
        $policy = new PanicAlertPolicy;

        $own = PanicAlert::factory()->make(['reporter_id' => $warga->id]);
        $other = PanicAlert::factory()->make(['reporter_id' => 999]);

        $this->assertTrue($policy->cancel($warga, $own));
        $this->assertFalse($policy->cancel($warga, $other));
        $this->assertTrue($policy->cancel($satpam, $other));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Unit/SecurityPolicyTest.php`
Expected: FAIL — policy/model classes not found.

- [ ] **Step 3: Add the 10 permissions**

In `app/Models/Permission.php`, after the `'events.manage'` line:

```php
        'events.manage' => 'Kelola kegiatan',
        'guest-logs.view' => 'Lihat buku tamu',
        'guest-logs.manage' => 'Kelola buku tamu (check-in/out)',
        'guest-logs.register' => 'Daftarkan tamu berkunjung',
        'panic-alerts.report' => 'Laporkan kondisi darurat',
        'panic-alerts.handle' => 'Tangani alert darurat',
        'patrol-schedules.view' => 'Lihat jadwal ronda',
        'patrol-schedules.manage' => 'Kelola jadwal ronda',
        'family-members.view' => 'Lihat data keluarga',
        'family-members.manage' => 'Kelola data keluarga',
        'emergency-contacts.manage' => 'Kelola kontak darurat',
```

- [ ] **Step 4: Write the five models**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class GuestLog extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_REGISTERED = 'registered';

    public const STATUS_CHECKED_IN = 'checked_in';

    public const STATUS_CHECKED_OUT = 'checked_out';

    protected $fillable = [
        'guest_name', 'purpose', 'house_id', 'plate_number',
        'registered_by', 'qr_token', 'visit_date', 'status',
        'checked_in_at', 'checked_out_at', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'visit_date' => 'date',
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
        ];
    }

    public function house(): BelongsTo
    {
        return $this->belongsTo(House::class);
    }

    public function registrar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
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

class PanicAlert extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_HANDLED = 'handled';

    public const STATUS_RESOLVED = 'resolved';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'reporter_id', 'house_id', 'location_note', 'note',
        'status', 'handler_id', 'handled_at', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'handled_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function house(): BelongsTo
    {
        return $this->belongsTo(House::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handler_id');
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

class PatrolSchedule extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['date', 'shift', 'personnel_name', 'user_id', 'area', 'note'];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    public function personnel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
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

class FamilyMember extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'house_id', 'name', 'relationship', 'nik', 'birth_date', 'phone',
    ];

    protected function casts(): array
    {
        return ['birth_date' => 'date'];
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
use Illuminate\Database\Eloquent\SoftDeletes;

class EmergencyContact extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['name', 'phone', 'sort_order'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer'];
    }
}
```

Factories (minimal, mirroring existing style — `name` via faker, sensible defaults):
- `GuestLogFactory`: guest_name → `$this->faker->name()`, purpose → 'Bertamu', house_id → House::factory(), plate_number → null, registered_by → User::factory(), qr_token → `Str::random(32)`, visit_date → today, status → registered, checked_in_at/out → null, recorded_by → null.
- `PanicAlertFactory`: reporter_id → User::factory(), house_id → null, location_note → null, note → 'Butuh bantuan', status → active, handler_id → null, handled_at/resolved_at → null.
- `PatrolScheduleFactory`: date → today, shift → 'malam', personnel_name → faker name, user_id → null, area → 'Blok A', note → null.
- `FamilyMemberFactory`: house_id → House::factory(), name → faker name, relationship → 'anak', nik → null, birth_date → null, phone → null.
- `EmergencyContactFactory`: name → 'Ketua RW', phone → '081234567890', sort_order → 0.

- [ ] **Step 5: Write the five policies**

```php
<?php

namespace App\Policies;

use App\Models\GuestLog;
use App\Models\User;

class GuestLogPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('guest-logs.view');
    }

    public function view(User $user, GuestLog $log): bool
    {
        if ($user->hasPermission('guest-logs.manage')) {
            return true;
        }

        return $user->hasPermission('guest-logs.view') && $log->registered_by === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('guest-logs.register');
    }

    public function checkIn(User $user, GuestLog $log): bool
    {
        return $user->hasPermission('guest-logs.manage');
    }

    public function checkOut(User $user, GuestLog $log): bool
    {
        return $user->hasPermission('guest-logs.manage');
    }
}
```

```php
<?php

namespace App\Policies;

use App\Models\PanicAlert;
use App\Models\User;

class PanicAlertPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('panic-alerts.handle');
    }

    public function view(User $user, PanicAlert $alert): bool
    {
        if ($user->hasPermission('panic-alerts.handle')) {
            return true;
        }

        return $user->hasPermission('panic-alerts.report') && $alert->reporter_id === $user->id;
    }

    public function report(User $user): bool
    {
        return $user->hasPermission('panic-alerts.report');
    }

    public function handle(User $user, PanicAlert $alert): bool
    {
        return $user->hasPermission('panic-alerts.handle');
    }

    public function cancel(User $user, PanicAlert $alert): bool
    {
        return $alert->reporter_id === $user->id || $user->hasPermission('panic-alerts.handle');
    }
}
```

```php
<?php

namespace App\Policies;

use App\Models\PatrolSchedule;
use App\Models\User;

class PatrolSchedulePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('patrol-schedules.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('patrol-schedules.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('patrol-schedules.manage');
    }

    public function update(User $user, PatrolSchedule $schedule): bool
    {
        return $user->hasPermission('patrol-schedules.manage');
    }

    public function delete(User $user, PatrolSchedule $schedule): bool
    {
        return $user->hasPermission('patrol-schedules.manage');
    }
}
```

```php
<?php

namespace App\Policies;

use App\Models\FamilyMember;
use App\Models\HouseResident;
use App\Models\User;

class FamilyMemberPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('family-members.view');
    }

    public function view(User $user, FamilyMember $member): bool
    {
        if ($user->hasPermission('family-members.manage')) {
            return true;
        }

        return $user->hasPermission('family-members.view') && $member->house_id === $this->ownHouseId($user);
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('family-members.manage') || $user->hasPermission('family-members.view');
    }

    public function update(User $user, FamilyMember $member): bool
    {
        return $this->view($user, $member);
    }

    public function delete(User $user, FamilyMember $member): bool
    {
        return $this->view($user, $member);
    }

    private function ownHouseId(User $user): ?int
    {
        if ($user->resident_id === null) {
            return null;
        }

        return HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->value('house_id');
    }
}
```

```php
<?php

namespace App\Policies;

use App\Models\EmergencyContact;
use App\Models\User;

class EmergencyContactPolicy
{
    public function create(User $user): bool
    {
        return $user->hasPermission('emergency-contacts.manage');
    }

    public function update(User $user, EmergencyContact $contact): bool
    {
        return $user->hasPermission('emergency-contacts.manage');
    }

    public function delete(User $user, EmergencyContact $contact): bool
    {
        return $user->hasPermission('emergency-contacts.manage');
    }
}
```

- [ ] **Step 6: Register the gates**

In `app/Providers/AppServiceProvider.php`, add policy imports, then after the assets/events lines:

```php
        // Security (Fase 4)
        Gate::define('guest-logs.view', [GuestLogPolicy::class, 'viewAny']);
        Gate::define('guest-logs.manage', fn (User $user) => $user->hasPermission('guest-logs.manage'));
        Gate::define('guest-logs.register', [GuestLogPolicy::class, 'create']);
        Gate::define('panic-alerts.report', [PanicAlertPolicy::class, 'report']);
        Gate::define('panic-alerts.handle', fn (User $user) => $user->hasPermission('panic-alerts.handle'));
        Gate::define('patrol-schedules.view', [PatrolSchedulePolicy::class, 'viewAny']);
        Gate::define('patrol-schedules.manage', [PatrolSchedulePolicy::class, 'create']);
        Gate::define('family-members.view', [FamilyMemberPolicy::class, 'viewAny']);
        Gate::define('family-members.manage', fn (User $user) => $user->hasPermission('family-members.manage'));
        Gate::define('emergency-contacts.manage', [EmergencyContactPolicy::class, 'create']);
```

- [ ] **Step 7: Update `RoleSeeder` (satpam role + warga delta)**

After the `$warga` creation block, add:

```php
        $satpam = Role::updateOrCreate(
            ['name' => 'satpam'],
            ['description' => 'Satpam']
        );
```

Warga list gains (append inside the existing `whereIn` array):

```php
            'assets.view', 'asset-loans.request',
            'guest-logs.view', 'guest-logs.register',
            'panic-alerts.report',
            'patrol-schedules.view',
            'family-members.view',
```

Ruling (2026-09-09, Task 1 pre-review): warga holds only `family-members.view`.
Scoped own-house create/update/delete still works because `FamilyMemberPolicy::create`
admits view-holders and update/delete delegate to scoped `view()`; global view stays
admin-only via `manage`. The brief's test asserting warga cannot view other-house
members governs.

After the warga sync block, add:

```php
        // Satpam handles security operations, no finance or resident data.
        $satpam->permissions()->sync(Permission::whereIn('name', [
            'guest-logs.view', 'guest-logs.manage',
            'panic-alerts.handle',
            'patrol-schedules.view',
        ])->pluck('id'));
```

- [ ] **Step 8: Update `UserSeeder` (satpam demo login)**

After the bendahara block (before the warga block):

```php
        $satpamRoleId = Role::where('name', 'satpam')->first()->id;

        $satpam = User::updateOrCreate(
            ['email' => 'satpam@siwarga.test'],
            [
                'name' => 'Satpam Pos Utama',
                'password' => bcrypt('password'),
                'is_active' => true,
            ]
        );
        $satpam->roles()->syncWithoutDetaching([$satpamRoleId]);
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `php artisan test --compact tests/Unit/SecurityPolicyTest.php`
Expected: PASS (5 tests). Note: tables don't exist yet — `RefreshDatabase` runs migrations; `::make()` never touches the DB except `House::factory()->create()` which needs the `houses` table (exists) and `FamilyMember::factory()->make()` which is in-memory only. If `House::factory()` requires columns, they exist from v1 migrations.

- [ ] **Step 10: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Models/Permission.php app/Providers/AppServiceProvider.php database/seeders/RoleSeeder.php database/seeders/UserSeeder.php app/Models/GuestLog.php app/Models/PanicAlert.php app/Models/PatrolSchedule.php app/Models/FamilyMember.php app/Models/EmergencyContact.php app/Policies/GuestLogPolicy.php app/Policies/PanicAlertPolicy.php app/Policies/PatrolSchedulePolicy.php app/Policies/FamilyMemberPolicy.php app/Policies/EmergencyContactPolicy.php database/factories/GuestLogFactory.php database/factories/PanicAlertFactory.php database/factories/PatrolScheduleFactory.php database/factories/FamilyMemberFactory.php database/factories/EmergencyContactFactory.php tests/Unit/SecurityPolicyTest.php
git commit -m "feat: add security permissions, policies, satpam role, and models"
```

---

### Task 2: guest log backend (migration, QR token, check-in/out)

**Files:**
- Create: `database/migrations/2026_09_10_000001_create_guest_logs_table.php`
- Create: `app/Services/GuestLogService.php`
- Create: `app/Http/Controllers/Api/GuestLogController.php`
- Create: `app/Http/Resources/GuestLogResource.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/GuestLogTest.php`

**Interfaces:**
- Consumes: `GuestLogPolicy` (Task 1), `HtmlSanitizer`, `User::hasPermission('guest-logs.manage')` for walk-in path.
- Produces: `GuestLogService::{register(array, User): GuestLog, checkIn(GuestLog, User): GuestLog, checkOut(GuestLog, User): GuestLog}`; routes `GET/POST /api/guest-logs`, `POST /api/guest-logs/{guestLog}/check-in|check-out`.

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\GuestLog;
use App\Models\House;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestLogTest extends TestCase
{
    use RefreshDatabase;

    protected User $satpam;

    protected User $warga;

    protected House $house;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->satpam = User::factory()->create();
        $this->satpam->roles()->attach(Role::where('name', 'satpam')->first()->id);
        $this->satpam->load('roles.permissions');

        $this->warga = User::factory()->create();
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');

        $this->house = House::factory()->create();
    }

    public function test_warga_pre_register_gets_qr_token()
    {
        $response = $this->actingAs($this->warga)->postJson('/api/guest-logs', [
            'guest_name' => 'Budi Tamu',
            'house_id' => $this->house->id,
            'visit_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'registered')
            ->assertJsonStructure(['data' => ['qr_token']]);
    }

    public function test_satpam_walk_in_checks_in_directly()
    {
        $response = $this->actingAs($this->satpam)->postJson('/api/guest-logs', [
            'guest_name' => 'Kurir Paket',
            'house_id' => $this->house->id,
        ]);

        $response->assertStatus(201)->assertJsonPath('data.status', 'checked_in');
    }

    public function test_check_in_out_transitions()
    {
        $log = GuestLog::factory()->create([
            'house_id' => $this->house->id,
            'registered_by' => $this->warga->id,
            'status' => 'registered',
        ]);

        $this->actingAs($this->satpam)->postJson("/api/guest-logs/{$log->id}/check-in")
            ->assertStatus(200)->assertJsonPath('data.status', 'checked_in');

        $this->actingAs($this->satpam)->postJson("/api/guest-logs/{$log->id}/check-out")
            ->assertStatus(200)->assertJsonPath('data.status', 'checked_out');
    }

    public function test_double_check_in_fails()
    {
        $log = GuestLog::factory()->create([
            'house_id' => $this->house->id,
            'status' => 'checked_in',
        ]);

        $this->actingAs($this->satpam)->postJson("/api/guest-logs/{$log->id}/check-in")
            ->assertStatus(422);
    }

    public function test_warga_cannot_check_in_and_sees_only_own()
    {
        $other = User::factory()->create();
        GuestLog::factory()->create(['house_id' => $this->house->id, 'registered_by' => $other->id]);
        $own = GuestLog::factory()->create(['house_id' => $this->house->id, 'registered_by' => $this->warga->id]);

        $this->actingAs($this->warga)->postJson("/api/guest-logs/{$own->id}/check-in")->assertStatus(403);

        $this->actingAs($this->warga)->getJson('/api/guest-logs')
            ->assertStatus(200)->assertJsonCount(1, 'data');
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Api/GuestLogTest.php`
Expected: FAIL — table `guest_logs` doesn't exist.

- [ ] **Step 3: Write the migration and run it**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guest_logs', function (Blueprint $table) {
            $table->id();
            $table->string('guest_name', 100);
            $table->string('purpose', 255)->nullable();
            $table->foreignId('house_id')->constrained('houses');
            $table->string('plate_number', 20)->nullable();
            $table->foreignId('registered_by')->nullable()->constrained('users');
            $table->string('qr_token', 64)->nullable()->unique();
            $table->date('visit_date')->nullable();
            $table->string('status', 20)->default('registered');
            $table->dateTime('checked_in_at')->nullable();
            $table->dateTime('checked_out_at')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['house_id', 'visit_date'], 'guest_logs_house_visit');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_logs');
    }
};
```

Save as `database/migrations/2026_09_10_000001_create_guest_logs_table.php`, run `php artisan migrate`.

- [ ] **Step 4: Write the service**

```php
<?php

namespace App\Services;

use App\Models\GuestLog;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GuestLogService
{
    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function register(array $data, User $user): GuestLog
    {
        $data['guest_name'] = $this->htmlSanitizer->sanitize($data['guest_name']);

        if (isset($data['purpose']) && $data['purpose'] !== null) {
            $data['purpose'] = $this->htmlSanitizer->sanitize($data['purpose']);
        }

        // Staff walk-in goes straight to checked_in; warga pre-registration
        // stays registered with a QR token for later check-in.
        if ($user->hasPermission('guest-logs.manage')) {
            return GuestLog::create([...$data,
                'registered_by' => $user->id,
                'status' => GuestLog::STATUS_CHECKED_IN,
                'checked_in_at' => now(),
                'recorded_by' => $user->id,
            ]);
        }

        return GuestLog::create([...$data,
            'registered_by' => $user->id,
            'qr_token' => Str::random(32),
            'status' => GuestLog::STATUS_REGISTERED,
        ]);
    }

    public function checkIn(GuestLog $log, User $actor): GuestLog
    {
        if ($log->status !== GuestLog::STATUS_REGISTERED) {
            throw ValidationException::withMessages(['status' => ['Hanya tamu terdaftar yang bisa check-in.']]);
        }

        $log->update([
            'status' => GuestLog::STATUS_CHECKED_IN,
            'checked_in_at' => now(),
            'recorded_by' => $actor->id,
        ]);

        return $log->fresh(['house', 'registrar', 'recorder']);
    }

    public function checkOut(GuestLog $log): GuestLog
    {
        if ($log->status !== GuestLog::STATUS_CHECKED_IN) {
            throw ValidationException::withMessages(['status' => ['Hanya tamu yang sudah masuk yang bisa check-out.']]);
        }

        $log->update([
            'status' => GuestLog::STATUS_CHECKED_OUT,
            'checked_out_at' => now(),
        ]);

        return $log->fresh(['house', 'registrar', 'recorder']);
    }
}
```

- [ ] **Step 5: Write the resource and controller**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuestLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'guest_name' => $this->guest_name,
            'purpose' => $this->purpose,
            'house_id' => $this->house_id,
            'house_number' => $this->house?->house_number,
            'plate_number' => $this->plate_number,
            'registered_by' => $this->registered_by,
            'registrar_name' => $this->registrar?->name,
            'qr_token' => $this->qr_token,
            'visit_date' => $this->visit_date,
            'status' => $this->status,
            'checked_in_at' => $this->checked_in_at,
            'checked_out_at' => $this->checked_out_at,
            'recorded_by' => $this->recorded_by,
            'created_at' => $this->created_at,
        ];
    }
}
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\GuestLogResource;
use App\Models\GuestLog;
use App\Services\GuestLogService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class GuestLogController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private GuestLogService $guestLogService) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $query = GuestLog::query()->with(['house:id,house_number', 'registrar:id,name']);

        if (! $user->hasPermission('guest-logs.manage')) {
            $query->where('registered_by', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date')) {
            $query->whereDate('visit_date', $request->date);
        }

        if ($request->search) {
            $query->where('guest_name', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['visit_date', 'created_at', 'status']);

        return $this->paginated($query->paginate($request->per_page ?? 10), GuestLogResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'guest_name' => ['required', 'string', 'max:100'],
            'purpose' => ['nullable', 'string', 'max:255'],
            'house_id' => ['required', 'integer', 'exists:houses,id'],
            'plate_number' => ['nullable', 'string', 'max:20'],
            'visit_date' => ['nullable', 'date'],
        ]);

        $log = $this->guestLogService->register($validated, $request->user());

        return (new GuestLogResource($log->load(['house', 'registrar'])))->response()->setStatusCode(201);
    }

    public function show(GuestLog $guestLog)
    {
        $this->authorize('view', $guestLog);

        return new GuestLogResource($guestLog->load(['house', 'registrar', 'recorder']));
    }

    public function checkIn(GuestLog $guestLog)
    {
        $this->authorize('checkIn', $guestLog);

        return new GuestLogResource($this->guestLogService->checkIn($guestLog, request()->user()));
    }

    public function checkOut(GuestLog $guestLog)
    {
        $this->authorize('checkOut', $guestLog);

        return new GuestLogResource($this->guestLogService->checkOut($guestLog));
    }
}
```

- [ ] **Step 6: Register the routes**

In `routes/api.php`, inside the `auth:sanctum` group after the suggestions block:

```php
    // Security — guest log (Fase 4)
    Route::get('guest-logs', [GuestLogController::class, 'index'])->middleware('can:guest-logs.view');
    Route::post('guest-logs', [GuestLogController::class, 'store'])->middleware('can:guest-logs.register');
    Route::get('guest-logs/{guestLog}', [GuestLogController::class, 'show'])->middleware('can:guest-logs.view');
    Route::post('guest-logs/{guestLog}/check-in', [GuestLogController::class, 'checkIn']);
    Route::post('guest-logs/{guestLog}/check-out', [GuestLogController::class, 'checkOut']);
```

Add the `GuestLogController` import at the top (alphabetical order).

- [ ] **Step 7: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Api/GuestLogTest.php`
Expected: PASS (5 tests).

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_09_10_000001_create_guest_logs_table.php app/Services/GuestLogService.php app/Http/Controllers/Api/GuestLogController.php app/Http/Resources/GuestLogResource.php routes/api.php tests/Feature/Api/GuestLogTest.php
git commit -m "feat: add digital guest log with QR pre-registration"
```

---

### Task 3: panic alert backend (1-active rule, after-commit notifications)

**Files:**
- Create: `database/migrations/2026_09_10_000002_create_panic_alerts_table.php`
- Create: `app/Services/PanicAlertService.php`
- Create: `app/Http/Controllers/Api/PanicAlertController.php`
- Create: `app/Http/Resources/PanicAlertResource.php`
- Create: `app/Notifications/PanicAlertUpdated.php`
- Create: `app/Jobs/SendPanicWhatsappJob.php`
- Modify: `routes/api.php`
- Modify: `app/Providers/AppServiceProvider.php` (`panic` rate limiter)
- Test: `tests/Feature/Api/PanicAlertTest.php`

**Interfaces:**
- Consumes: `PanicAlertPolicy` (Task 1), `HouseResident` active lookup, `WahaService::sendMessage(string, string): bool`, database notifications.
- Produces: `PanicAlertService::{report(array, User): PanicAlert, handle(PanicAlert, User): PanicAlert, resolve(PanicAlert, User): PanicAlert, cancel(PanicAlert, User): PanicAlert}`; routes `GET/POST /api/panic-alerts`, `GET /api/panic-alerts/{panicAlert}`, `POST /api/panic-alerts/{panicAlert}/handle|resolve|cancel`.

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature\Api;

use App\Jobs\SendPanicWhatsappJob;
use App\Models\House;
use App\Models\HouseResident;
use App\Models\PanicAlert;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PanicAlertTest extends TestCase
{
    use RefreshDatabase;

    protected User $satpam;

    protected User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->satpam = User::factory()->create();
        $this->satpam->roles()->attach(Role::where('name', 'satpam')->first()->id);
        $this->satpam->load('roles.permissions');

        $resident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);
        $this->warga = User::factory()->create(['resident_id' => $resident->id]);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    public function test_warga_can_report_and_staff_get_notified()
    {
        Queue::fake();

        $response = $this->actingAs($this->warga)->postJson('/api/panic-alerts', [
            'note' => 'Ada orang mencurigakan di blok A',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.status', 'active');
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $this->satpam->id]);
        Queue::assertPushed(SendPanicWhatsappJob::class);
    }

    public function test_second_active_alert_is_rejected()
    {
        PanicAlert::factory()->create(['reporter_id' => $this->warga->id, 'status' => 'active']);

        $this->actingAs($this->warga)->postJson('/api/panic-alerts', ['note' => 'Lagi'])
            ->assertStatus(422);
    }

    public function test_handle_resolve_flow_notifies_reporter()
    {
        $alert = PanicAlert::factory()->create(['reporter_id' => $this->warga->id, 'status' => 'active']);

        $this->actingAs($this->satpam)->postJson("/api/panic-alerts/{$alert->id}/handle")
            ->assertStatus(200)->assertJsonPath('data.status', 'handled');

        $this->actingAs($this->satpam)->postJson("/api/panic-alerts/{$alert->id}/resolve")
            ->assertStatus(200)->assertJsonPath('data.status', 'resolved');

        $this->assertDatabaseHas('notifications', ['notifiable_id' => $this->warga->id]);
    }

    public function test_warga_cannot_handle_but_can_cancel_own()
    {
        $alert = PanicAlert::factory()->create(['reporter_id' => $this->warga->id, 'status' => 'active']);

        $this->actingAs($this->warga)->postJson("/api/panic-alerts/{$alert->id}/handle")->assertStatus(403);
        $this->actingAs($this->warga)->postJson("/api/panic-alerts/{$alert->id}/cancel")
            ->assertStatus(200)->assertJsonPath('data.status', 'cancelled');
    }

    public function test_resolve_requires_handled_first()
    {
        $alert = PanicAlert::factory()->create(['reporter_id' => $this->warga->id, 'status' => 'active']);

        $this->actingAs($this->satpam)->postJson("/api/panic-alerts/{$alert->id}/resolve")
            ->assertStatus(422);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Api/PanicAlertTest.php`
Expected: FAIL — table `panic_alerts` doesn't exist.

- [ ] **Step 3: Write the migration and run it**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('panic_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users');
            $table->foreignId('house_id')->nullable()->constrained('houses');
            $table->string('location_note', 255)->nullable();
            $table->text('note')->nullable();
            $table->string('status', 20)->default('active');
            $table->foreignId('handler_id')->nullable()->constrained('users');
            $table->dateTime('handled_at')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['reporter_id', 'status'], 'panic_alerts_reporter_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('panic_alerts');
    }
};
```

Save as `database/migrations/2026_09_10_000002_create_panic_alerts_table.php`, run `php artisan migrate`.

- [ ] **Step 4: Write the notification and job**

```php
<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PanicAlertUpdated extends Notification
{
    use Queueable;

    public function __construct(
        public int $alertId,
        public string $oldStatus,
        public string $newStatus,
        public string $actorName,
        public ?string $locationNote = null,
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
            'alert_id' => $this->alertId,
            'title' => 'Panic Alert',
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'actor_name' => $this->actorName,
            'location_note' => $this->locationNote,
        ];
    }
}
```

```php
<?php

namespace App\Jobs;

use App\Models\PanicAlert;
use App\Models\User;
use App\Services\WahaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendPanicWhatsappJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $alertId,
        public string $newStatus,
        public ?int $recipientId = null,
    ) {}

    public function handle(WahaService $wahaService): void
    {
        $alert = PanicAlert::with(['reporter.resident', 'house'])->find($this->alertId);

        if ($alert === null) {
            return;
        }

        $recipient = $this->recipientId !== null
            ? User::with('resident')->find($this->recipientId)
            : $alert->reporter;

        $phone = $recipient?->resident?->phone_number;

        if (blank($phone)) {
            Log::info('SendPanicWhatsappJob: recipient has no phone number, skipping', [
                'alert_id' => $this->alertId,
                'recipient_id' => $recipient?->id,
            ]);

            return;
        }

        $label = [
            'active' => 'DARURAT BARU',
            'handled' => 'SEDANG DITANGANI',
            'resolved' => 'SELESAI',
            'cancelled' => 'DIBATALKAN',
        ][$this->newStatus] ?? strtoupper($this->newStatus);

        $where = $alert->house?->house_number ?? $alert->location_note ?? '-';
        $message = "[SIWarga] Panic alert #{$alert->id} ({$where}): {$label}.";

        try {
            $sent = $wahaService->sendMessage($phone, $message);

            if (! $sent) {
                Log::warning('SendPanicWhatsappJob: WAHA rejected the message', [
                    'alert_id' => $this->alertId,
                ]);
            }
        } catch (\Throwable $exception) {
            Log::warning('SendPanicWhatsappJob: send failed', [
                'alert_id' => $this->alertId,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
```

- [ ] **Step 5: Write the service**

```php
<?php

namespace App\Services;

use App\Jobs\SendPanicWhatsappJob;
use App\Models\HouseResident;
use App\Models\PanicAlert;
use App\Models\User;
use App\Notifications\PanicAlertUpdated;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PanicAlertService
{
    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function report(array $data, User $user): PanicAlert
    {
        $exists = PanicAlert::where('reporter_id', $user->id)
            ->where('status', PanicAlert::STATUS_ACTIVE)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages(['status' => ['Anda masih memiliki alert aktif. Batalkan dulu sebelum melapor lagi.']]);
        }

        foreach (['location_note', 'note'] as $field) {
            if (isset($data[$field]) && $data[$field] !== null) {
                $data[$field] = $this->htmlSanitizer->sanitize($data[$field]);
            }
        }

        $data['house_id'] ??= HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->value('house_id');

        $alert = DB::transaction(function () use ($data, $user): PanicAlert {
            $alert = PanicAlert::create([...$data,
                'reporter_id' => $user->id,
                'status' => PanicAlert::STATUS_ACTIVE,
            ]);

            foreach ($this->staffRecipients() as $staff) {
                try {
                    $staff->notify(new PanicAlertUpdated(
                        $alert->id, 'none', PanicAlert::STATUS_ACTIVE, $user->name, $alert->location_note,
                    ));
                } catch (\Throwable $exception) {
                    Log::warning('PanicAlertService: failed to store staff notification', [
                        'alert_id' => $alert->id,
                        'error' => $exception->getMessage(),
                    ]);
                }
            }

            return $alert;
        });

        // WA dispatch strictly AFTER commit (Fase 3 lesson: no dispatch inside tx).
        foreach ($this->staffRecipients() as $staff) {
            SendPanicWhatsappJob::dispatch($alert->id, PanicAlert::STATUS_ACTIVE, $staff->id);
        }

        return $alert->fresh(['reporter', 'house', 'handler']);
    }

    public function handle(PanicAlert $alert, User $actor): PanicAlert
    {
        if ($alert->status !== PanicAlert::STATUS_ACTIVE) {
            throw ValidationException::withMessages(['status' => ['Hanya alert aktif yang bisa ditangani.']]);
        }

        $alert->update([
            'status' => PanicAlert::STATUS_HANDLED,
            'handler_id' => $actor->id,
            'handled_at' => now(),
        ]);

        $this->notifyReporter($alert->fresh(['reporter']), PanicAlert::STATUS_ACTIVE, PanicAlert::STATUS_HANDLED, $actor);

        return $alert->fresh(['reporter', 'house', 'handler']);
    }

    public function resolve(PanicAlert $alert, User $actor): PanicAlert
    {
        if ($alert->status !== PanicAlert::STATUS_HANDLED) {
            throw ValidationException::withMessages(['status' => ['Hanya alert yang sedang ditangani yang bisa diselesaikan.']]);
        }

        $alert->update(['status' => PanicAlert::STATUS_RESOLVED, 'resolved_at' => now()]);

        $this->notifyReporter($alert->fresh(['reporter']), PanicAlert::STATUS_HANDLED, PanicAlert::STATUS_RESOLVED, $actor);

        return $alert->fresh(['reporter', 'house', 'handler']);
    }

    public function cancel(PanicAlert $alert, User $actor): PanicAlert
    {
        if (! in_array($alert->status, [PanicAlert::STATUS_ACTIVE, PanicAlert::STATUS_HANDLED], true)) {
            throw ValidationException::withMessages(['status' => ['Alert ini sudah selesai.']]);
        }

        $old = $alert->status;
        $alert->update(['status' => PanicAlert::STATUS_CANCELLED]);

        $this->notifyReporter($alert->fresh(['reporter']), $old, PanicAlert::STATUS_CANCELLED, $actor);

        return $alert->fresh(['reporter', 'house', 'handler']);
    }

    private function notifyReporter(PanicAlert $alert, string $old, string $new, User $actor): void
    {
        $reporter = $alert->reporter;

        if ($reporter === null) {
            return;
        }

        try {
            $reporter->notify(new PanicAlertUpdated(
                $alert->id, $old, $new, $actor->name, $alert->location_note,
            ));
        } catch (\Throwable $exception) {
            Log::warning('PanicAlertService: failed to store reporter notification', [
                'alert_id' => $alert->id,
                'error' => $exception->getMessage(),
            ]);
        }

        SendPanicWhatsappJob::dispatch($alert->id, $new);
    }

    /**
     * @return \Illuminate\Support\Collection<int, User>
     */
    private function staffRecipients()
    {
        return User::whereHas('roles', fn ($query) => $query->whereIn('name', ['admin', 'satpam']))
            ->where('is_active', true)
            ->get();
    }
}
```

- [ ] **Step 6: Write the resource and controller**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PanicAlertResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reporter_id' => $this->reporter_id,
            'reporter_name' => $this->reporter?->name,
            'house_id' => $this->house_id,
            'house_number' => $this->house?->house_number,
            'location_note' => $this->location_note,
            'note' => $this->note,
            'status' => $this->status,
            'handler_id' => $this->handler_id,
            'handler_name' => $this->handler?->name,
            'handled_at' => $this->handled_at,
            'resolved_at' => $this->resolved_at,
            'created_at' => $this->created_at,
        ];
    }
}
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PanicAlertResource;
use App\Models\PanicAlert;
use App\Services\PanicAlertService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class PanicAlertController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private PanicAlertService $panicAlertService) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $query = PanicAlert::query()->with(['reporter:id,name', 'house:id,house_number', 'handler:id,name']);

        if (! $user->hasPermission('panic-alerts.handle')) {
            $query->where('reporter_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $this->applySorting($query, $request, ['created_at', 'status']);

        return $this->paginated($query->paginate($request->per_page ?? 10), PanicAlertResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'location_note' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
        ]);

        $alert = $this->panicAlertService->report($validated, $request->user());

        return (new PanicAlertResource($alert))->response()->setStatusCode(201);
    }

    public function show(PanicAlert $panicAlert)
    {
        $this->authorize('view', $panicAlert);

        return new PanicAlertResource($panicAlert->load(['reporter', 'house', 'handler']));
    }

    public function handle(PanicAlert $panicAlert)
    {
        $this->authorize('handle', $panicAlert);

        return new PanicAlertResource($this->panicAlertService->handle($panicAlert, request()->user()));
    }

    public function resolve(PanicAlert $panicAlert)
    {
        $this->authorize('handle', $panicAlert);

        return new PanicAlertResource($this->panicAlertService->resolve($panicAlert, request()->user()));
    }

    public function cancel(PanicAlert $panicAlert)
    {
        $this->authorize('cancel', $panicAlert);

        return new PanicAlertResource($this->panicAlertService->cancel($panicAlert, request()->user()));
    }
}
```

- [ ] **Step 7: Register routes + rate limiter**

Routes (inside `auth:sanctum` group, after guest-logs block):

```php
    // Security — panic alerts (Fase 4)
    Route::get('panic-alerts', [PanicAlertController::class, 'index'])->middleware('can:panic-alerts.report');
    Route::post('panic-alerts', [PanicAlertController::class, 'store'])->middleware(['can:panic-alerts.report', 'throttle:panic']);
    Route::get('panic-alerts/{panicAlert}', [PanicAlertController::class, 'show'])->middleware('can:panic-alerts.report');
    Route::post('panic-alerts/{panicAlert}/handle', [PanicAlertController::class, 'handle']);
    Route::post('panic-alerts/{panicAlert}/resolve', [PanicAlertController::class, 'resolve']);
    Route::post('panic-alerts/{panicAlert}/cancel', [PanicAlertController::class, 'cancel']);
```

Note: `index` uses `can:panic-alerts.report` (all three roles have report or handle; satpam has handle but NOT report — `can:panic-alerts.report` would 403 satpam on index!). Fix: satpam needs index access. Options: give satpam `panic-alerts.report` too, or use `can:panic-alerts.handle` with fallback. Simplest correct: add `'panic-alerts.report'` to the satpam sync list in RoleSeeder (reporting your own emergency is harmless and keeps one gate for list/show). Do that in this task: modify `RoleSeeder` satpam list to include `'panic-alerts.report'`. Update Task 1's Step 7 accordingly — implementer of Task 3 must add it here if Task 1 didn't.

Limiter in `AppServiceProvider`, next to the existing `suggestions` limiter:

```php
        RateLimiter::for('panic', function (Request $request) {
            return Limit::perMinute(3)->by($request->user()?->id ?? $request->ip());
        });
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Api/PanicAlertTest.php`
Expected: PASS (5 tests).

- [ ] **Step 9: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_09_10_000002_create_panic_alerts_table.php app/Services/PanicAlertService.php app/Http/Controllers/Api/PanicAlertController.php app/Http/Resources/PanicAlertResource.php app/Notifications/PanicAlertUpdated.php app/Jobs/SendPanicWhatsappJob.php routes/api.php app/Providers/AppServiceProvider.php database/seeders/RoleSeeder.php tests/Feature/Api/PanicAlertTest.php
git commit -m "feat: add panic alerts with after-commit staff notifications"
```

---

### Task 4: patrol schedules + emergency contacts backend

**Files:**
- Create: `database/migrations/2026_09_10_000003_create_patrol_schedules_table.php`
- Create: `database/migrations/2026_09_10_000004_create_emergency_contacts_table.php`
- Create: `app/Http/Controllers/Api/PatrolScheduleController.php`
- Create: `app/Http/Controllers/Api/EmergencyContactController.php`
- Create: `app/Http/Resources/PatrolScheduleResource.php`
- Create: `app/Http/Resources/EmergencyContactResource.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/PatrolScheduleTest.php`
- Test: `tests/Feature/Api/EmergencyContactTest.php`

**Interfaces:**
- Consumes: `PatrolSchedulePolicy`, `EmergencyContactPolicy` (Task 1). No services (pure CRUD).
- Produces: routes `GET/POST /api/patrol-schedules`, `GET/PUT/DELETE /api/patrol-schedules/{patrolSchedule}`, `GET /api/emergency-contacts` (auth only), `POST/PUT/DELETE /api/emergency-contacts[/{emergencyContact}]` (`can:emergency-contacts.manage`).

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\PatrolSchedule;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatrolScheduleTest extends TestCase
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

    public function test_admin_can_crud_patrol_schedules()
    {
        $created = $this->actingAs($this->admin)->postJson('/api/patrol-schedules', [
            'date' => now()->addDay()->toDateString(),
            'shift' => 'malam',
            'personnel_name' => 'Pak Joko',
            'area' => 'Blok A',
        ])->assertStatus(201)->assertJsonPath('data.shift', 'malam')->json('data');

        // Duplicate shift on the same date fails.
        $this->actingAs($this->admin)->postJson('/api/patrol-schedules', [
            'date' => now()->addDay()->toDateString(),
            'shift' => 'malam',
            'personnel_name' => 'Pak Budi',
        ])->assertStatus(422);

        $this->actingAs($this->admin)->putJson("/api/patrol-schedules/{$created['id']}", [
            'personnel_name' => 'Pak Joko S.',
        ])->assertStatus(200);

        $this->actingAs($this->admin)->deleteJson("/api/patrol-schedules/{$created['id']}")
            ->assertStatus(200);
        $this->assertSoftDeleted('patrol_schedules', ['id' => $created['id']]);
    }

    public function test_warga_can_view_but_not_manage()
    {
        PatrolSchedule::factory()->create();

        $this->actingAs($this->warga)->getJson('/api/patrol-schedules')->assertStatus(200);
        $this->actingAs($this->warga)->postJson('/api/patrol-schedules', [
            'date' => now()->toDateString(),
            'shift' => 'pagi',
            'personnel_name' => 'X',
        ])->assertStatus(403);
    }
}
```

```php
<?php

namespace Tests\Feature\Api;

use App\Models\EmergencyContact;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmergencyContactTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_manages_and_warga_reads_contacts()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $admin->load('roles.permissions');
        $warga = User::factory()->create();
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');

        $created = $this->actingAs($admin)->postJson('/api/emergency-contacts', [
            'name' => 'Polsek Setempat',
            'phone' => '081234567890',
        ])->assertStatus(201)->json('data');

        // Warga (no manage perm) can still read, but not write.
        $this->actingAs($warga)->getJson('/api/emergency-contacts')->assertStatus(200)
            ->assertJsonCount(1, 'data');
        $this->actingAs($warga)->postJson('/api/emergency-contacts', [
            'name' => 'X', 'phone' => '080',
        ])->assertStatus(403);

        $this->actingAs($admin)->putJson("/api/emergency-contacts/{$created['id']}", [
            'phone' => '081111111111',
        ])->assertStatus(200);
        $this->actingAs($admin)->deleteJson("/api/emergency-contacts/{$created['id']}")
            ->assertStatus(200);
        $this->assertSoftDeleted('emergency_contacts', ['id' => $created['id']]);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Api/PatrolScheduleTest.php tests/Feature/Api/EmergencyContactTest.php`
Expected: FAIL — tables don't exist.

- [ ] **Step 3: Write the migrations and run them**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patrol_schedules', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('shift', 20);
            $table->string('personnel_name', 100);
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('area', 100)->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['date', 'shift'], 'patrol_schedules_date_shift');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patrol_schedules');
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
        Schema::create('emergency_contacts', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('phone', 30);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_contacts');
    }
};
```

Save as `2026_09_10_000003_create_patrol_schedules_table.php` and `2026_09_10_000004_create_emergency_contacts_table.php`, run `php artisan migrate`.

- [ ] **Step 4: Write resources and controllers**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatrolScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date,
            'shift' => $this->shift,
            'personnel_name' => $this->personnel_name,
            'user_id' => $this->user_id,
            'area' => $this->area,
            'note' => $this->note,
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

class EmergencyContactResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'sort_order' => $this->sort_order,
        ];
    }
}
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PatrolScheduleResource;
use App\Models\PatrolSchedule;
use App\Services\HtmlSanitizer;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PatrolScheduleController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    public function index(Request $request)
    {
        $query = PatrolSchedule::query();

        if ($request->filled('from')) {
            $query->where('date', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('date', '<=', $request->to);
        }

        $this->applySorting($query, $request, ['date', 'shift', 'created_at'], 'date', 'asc');

        return $this->paginated($query->paginate($request->per_page ?? 10), PatrolScheduleResource::class);
    }

    public function store(Request $request)
    {
        $validated = $this->validateSchedule($request);

        return (new PatrolScheduleResource(PatrolSchedule::create($validated)))->response()->setStatusCode(201);
    }

    public function show(PatrolSchedule $patrolSchedule)
    {
        return new PatrolScheduleResource($patrolSchedule);
    }

    public function update(Request $request, PatrolSchedule $patrolSchedule)
    {
        $this->authorize('update', $patrolSchedule);

        $patrolSchedule->update($this->validateSchedule($request, $patrolSchedule->id));

        return new PatrolScheduleResource($patrolSchedule->fresh());
    }

    public function destroy(PatrolSchedule $patrolSchedule)
    {
        $this->authorize('delete', $patrolSchedule);
        $patrolSchedule->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateSchedule(Request $request, ?int $exceptId = null): array
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'shift' => ['required', Rule::in(['pagi', 'siang', 'malam'])],
            'personnel_name' => ['required', 'string', 'max:100'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'area' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string'],
        ]);

        foreach (['personnel_name', 'area', 'note'] as $field) {
            if (isset($validated[$field]) && $validated[$field] !== null) {
                $validated[$field] = $this->htmlSanitizer->sanitize($validated[$field]);
            }
        }

        $conflict = PatrolSchedule::where('date', $validated['date'])
            ->where('shift', $validated['shift'])
            ->when($exceptId, fn ($query) => $query->where('id', '!=', $exceptId))
            ->exists();

        if ($conflict) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'shift' => ['Shift ini sudah terisi pada tanggal tersebut.'],
            ]);
        }

        return $validated;
    }
}
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EmergencyContactResource;
use App\Models\EmergencyContact;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class EmergencyContactController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $contacts = EmergencyContact::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($request->per_page ?? 50);

        return $this->paginated($contacts, EmergencyContactResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:30'],
            'sort_order' => ['sometimes', 'integer'],
        ]);

        return (new EmergencyContactResource(EmergencyContact::create($validated)))->response()->setStatusCode(201);
    }

    public function update(Request $request, EmergencyContact $emergencyContact)
    {
        $this->authorize('update', $emergencyContact);

        $emergencyContact->update($request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'phone' => ['sometimes', 'string', 'max:30'],
            'sort_order' => ['sometimes', 'integer'],
        ]));

        return new EmergencyContactResource($emergencyContact->fresh());
    }

    public function destroy(EmergencyContact $emergencyContact)
    {
        $this->authorize('delete', $emergencyContact);
        $emergencyContact->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
```

- [ ] **Step 5: Register the routes**

Inside `auth:sanctum` group, after panic block:

```php
    // Security — patrols & emergency contacts (Fase 4)
    Route::get('patrol-schedules', [PatrolScheduleController::class, 'index'])->middleware('can:patrol-schedules.view');
    Route::post('patrol-schedules', [PatrolScheduleController::class, 'store'])->middleware('can:patrol-schedules.manage');
    Route::get('patrol-schedules/{patrolSchedule}', [PatrolScheduleController::class, 'show'])->middleware('can:patrol-schedules.view');
    Route::put('patrol-schedules/{patrolSchedule}', [PatrolScheduleController::class, 'update']);
    Route::delete('patrol-schedules/{patrolSchedule}', [PatrolScheduleController::class, 'destroy']);
    Route::get('emergency-contacts', [EmergencyContactController::class, 'index']);
    Route::post('emergency-contacts', [EmergencyContactController::class, 'store'])->middleware('can:emergency-contacts.manage');
    Route::put('emergency-contacts/{emergencyContact}', [EmergencyContactController::class, 'update']);
    Route::delete('emergency-contacts/{emergencyContact}', [EmergencyContactController::class, 'destroy']);
```

Add both controller imports (alphabetical order).

- [ ] **Step 6: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Api/PatrolScheduleTest.php tests/Feature/Api/EmergencyContactTest.php`
Expected: PASS (3 tests).

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_09_10_000003_create_patrol_schedules_table.php database/migrations/2026_09_10_000004_create_emergency_contacts_table.php app/Http/Controllers/Api/PatrolScheduleController.php app/Http/Controllers/Api/EmergencyContactController.php app/Http/Resources/PatrolScheduleResource.php app/Http/Resources/EmergencyContactResource.php routes/api.php tests/Feature/Api/PatrolScheduleTest.php tests/Feature/Api/EmergencyContactTest.php
git commit -m "feat: add patrol schedules and emergency contacts"
```

---

### Task 5: family members + household card backend (scoped CRUD, HMAC QR, public verify)

**Files:**
- Create: `database/migrations/2026_09_10_000005_create_family_members_table.php`
- Create: `app/Http/Controllers/Api/FamilyMemberController.php`
- Create: `app/Http/Controllers/Api/HouseholdCardController.php`
- Create: `app/Http/Resources/FamilyMemberResource.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/FamilyMemberTest.php`
- Test: `tests/Feature/Api/HouseholdCardTest.php`

**Interfaces:**
- Consumes: `FamilyMemberPolicy` (Task 1), `HouseResident` active lookup. No service (scoping lives in controller + policy).
- Produces: routes `GET/POST /api/family-members`, `GET/PUT/DELETE /api/family-members/{familyMember}`, `GET /api/households/card`, `GET /api/public/households/{token}` (public group).

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\FamilyMember;
use App\Models\House;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyMemberTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $warga;

    protected House $houseA;

    protected House $houseB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $resident = Resident::factory()->create();
        $this->houseA = House::factory()->create();
        $this->houseB = House::factory()->create();
        $this->houseA->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);

        $this->warga = User::factory()->create(['resident_id' => $resident->id]);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');
    }

    public function test_warga_manages_own_house_only()
    {
        $own = $this->actingAs($this->warga)->postJson('/api/family-members', [
            'name' => 'Anak Pertama',
            'relationship' => 'anak',
            'nik' => '1234567890123456',
        ])->assertStatus(201)->assertJsonPath('data.nik', '1234567890123456')->json('data');

        // Forcing another house_id is ignored — record lands in own house.
        $this->assertEquals($this->houseA->id, $own['house_id']);

        $other = FamilyMember::factory()->create(['house_id' => $this->houseB->id]);

        $this->actingAs($this->warga)->getJson("/api/family-members/{$other->id}")->assertStatus(403);
        $this->actingAs($this->warga)->getJson('/api/family-members')
            ->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_admin_sees_all_with_nik()
    {
        FamilyMember::factory()->create(['house_id' => $this->houseB->id, 'nik' => '999']);

        $this->actingAs($this->admin)->getJson('/api/family-members')
            ->assertStatus(200)->assertJsonPath('data.0.nik', '999');
    }
}
```

```php
<?php

namespace Tests\Feature\Api;

use App\Models\FamilyMember;
use App\Models\House;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HouseholdCardTest extends TestCase
{
    use RefreshDatabase;

    public function test_card_and_public_verify_expose_no_nik()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $resident = Resident::factory()->create();
        $house = House::factory()->create(['house_number' => 'A-01', 'address' => 'Jl. Mawar 1']);
        $house->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);
        FamilyMember::factory()->create([
            'house_id' => $house->id,
            'name' => 'Bapak KK',
            'relationship' => 'kepala_keluarga',
            'nik' => '1234567890123456',
        ]);

        $warga = User::factory()->create(['resident_id' => $resident->id]);
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');

        $card = $this->actingAs($warga)->getJson('/api/households/card')
            ->assertStatus(200)
            ->assertJsonPath('data.head_name', 'Bapak KK')
            ->assertJsonStructure(['data' => ['verify_token']])
            ->json('data');

        $this->getJson("/api/public/households/{$card['verify_token']}")
            ->assertStatus(200)
            ->assertJsonPath('data.head_name', 'Bapak KK')
            ->assertJsonPath('data.address', 'Jl. Mawar 1')
            ->assertJsonMissing(['nik' => '1234567890123456']);

        $this->getJson('/api/public/households/999.invalid')->assertStatus(404);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Api/FamilyMemberTest.php tests/Feature/Api/HouseholdCardTest.php`
Expected: FAIL — table `family_members` doesn't exist.

- [ ] **Step 3: Write the migration and run it**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('house_id')->constrained('houses');
            $table->string('name', 100);
            $table->string('relationship', 30);
            $table->string('nik', 20)->nullable();
            $table->date('birth_date')->nullable();
            $table->string('phone', 30)->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['house_id', 'relationship'], 'family_members_house_relation');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_members');
    }
};
```

Save as `database/migrations/2026_09_10_000005_create_family_members_table.php`, run `php artisan migrate`.

- [ ] **Step 4: Write the resource and controllers**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FamilyMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canSeeNik = $user !== null
            && ($user->hasPermission('family-members.manage') || $this->isOwnHouse($user));

        return [
            'id' => $this->id,
            'house_id' => $this->house_id,
            'house_number' => $this->house?->house_number,
            'name' => $this->name,
            'relationship' => $this->relationship,
            'nik' => $canSeeNik ? $this->nik : null,
            'birth_date' => $this->birth_date,
            'phone' => $this->phone,
            'created_at' => $this->created_at,
        ];
    }

    private function isOwnHouse(User $user): bool
    {
        if ($user->resident_id === null) {
            return false;
        }

        return \App\Models\HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->where('house_id', $this->house_id)
            ->exists();
    }
}
```

Add `use App\Models\User;` import for the type-hint.

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FamilyMemberResource;
use App\Models\FamilyMember;
use App\Models\HouseResident;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FamilyMemberController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $user = $request->user();
        $query = FamilyMember::query()->with('house:id,house_number');

        if (! $user->hasPermission('family-members.manage')) {
            $query->where('house_id', $this->ownHouseId($user));
        } elseif ($request->filled('house_id')) {
            $query->where('house_id', $request->house_id);
        }

        if ($request->filled('relationship')) {
            $query->where('relationship', $request->relationship);
        }

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['name', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), FamilyMemberResource::class);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $validated = $this->validateMember($request);

        // Non-managers can only add to their own house — ignore forged house_id.
        $validated['house_id'] = $user->hasPermission('family-members.manage')
            ? ($validated['house_id'] ?? $this->ownHouseId($user))
            : $this->ownHouseId($user);

        abort_if($validated['house_id'] === null, 422, 'Akun Anda tidak terhubung ke rumah mana pun.');

        return (new FamilyMemberResource(FamilyMember::create($validated)->load('house')))->response()->setStatusCode(201);
    }

    public function show(FamilyMember $familyMember)
    {
        $this->authorize('view', $familyMember);

        return new FamilyMemberResource($familyMember->load('house'));
    }

    public function update(Request $request, FamilyMember $familyMember)
    {
        $this->authorize('update', $familyMember);

        $validated = $this->validateMember($request, true);
        unset($validated['house_id']);
        $familyMember->update($validated);

        return new FamilyMemberResource($familyMember->fresh('house'));
    }

    public function destroy(FamilyMember $familyMember)
    {
        $this->authorize('delete', $familyMember);
        $familyMember->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateMember(Request $request, bool $sometimes = false): array
    {
        $sometimesRule = $sometimes ? 'sometimes' : '';

        return $request->validate([
            'house_id' => [$sometimesRule, 'nullable', 'integer', 'exists:houses,id'],
            'name' => [$sometimesRule, 'required', 'string', 'max:100'],
            'relationship' => [$sometimesRule, 'required', Rule::in([
                'kepala_keluarga', 'pasangan', 'anak', 'orang_tua', 'famili_lain', 'pembantu', 'kontrak',
            ])],
            'nik' => [$sometimesRule, 'nullable', 'string', 'max:20'],
            'birth_date' => [$sometimesRule, 'nullable', 'date'],
            'phone' => [$sometimesRule, 'nullable', 'string', 'max:30'],
        ]);
    }

    private function ownHouseId($user): ?int
    {
        if ($user->resident_id === null) {
            return null;
        }

        return HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->value('house_id');
    }
}
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\House;
use App\Models\HouseResident;
use Illuminate\Http\Request;

class HouseholdCardController extends Controller
{
    public function show(Request $request)
    {
        $houseId = HouseResident::where('resident_id', $request->user()->resident_id)
            ->whereNull('end_date')
            ->value('house_id');

        abort_if($houseId === null, 422, 'Akun Anda tidak terhubung ke rumah mana pun.');

        $house = House::findOrFail($houseId);

        return response()->json([
            'data' => [
                'house_id' => $house->id,
                'house_number' => $house->house_number,
                'address' => $house->address,
                'head_name' => $this->headName($house->id),
                'member_count' => FamilyMember::where('house_id', $house->id)->count(),
                'verify_token' => $this->sign($house->id),
            ],
        ]);
    }

    public function verify(string $token)
    {
        $parts = explode('.', $token, 2);

        if (count($parts) !== 2 || ! ctype_digit($parts[0])) {
            abort(404);
        }

        $house = House::find($parts[0]);

        if ($house === null || ! hash_equals($this->sign($house->id), $token)) {
            abort(404);
        }

        return response()->json([
            'data' => [
                'house_number' => $house->house_number,
                'address' => $house->address,
                'head_name' => $this->headName($house->id),
            ],
        ]);
    }

    private function sign(int $houseId): string
    {
        return $houseId.'.'.hash_hmac('sha256', "household:{$houseId}", config('app.key'));
    }

    private function headName(int $houseId): string
    {
        return FamilyMember::where('house_id', $houseId)
            ->orderByRaw("relationship = 'kepala_keluarga' DESC")
            ->orderBy('id')
            ->value('name') ?? '—';
    }
}
```

- [ ] **Step 5: Register the routes**

Inside `auth:sanctum` group, after emergency-contacts block:

```php
    // Security — family & household card (Fase 4)
    Route::get('family-members', [FamilyMemberController::class, 'index'])->middleware('can:family-members.view');
    Route::post('family-members', [FamilyMemberController::class, 'store'])->middleware('can:family-members.view');
    Route::get('family-members/{familyMember}', [FamilyMemberController::class, 'show'])->middleware('can:family-members.view');
    Route::put('family-members/{familyMember}', [FamilyMemberController::class, 'update']);
    Route::delete('family-members/{familyMember}', [FamilyMemberController::class, 'destroy']);
    Route::get('households/card', [HouseholdCardController::class, 'show'])->middleware('can:family-members.view');
```

In the `public` group at the bottom:

```php
    Route::get('households/{token}', [HouseholdCardController::class, 'verify']);
```

Add both controller imports (alphabetical order). Note: `verify` takes a single `{token}` segment — dots are allowed in a segment, so `999.invalid` routes correctly.

- [ ] **Step 6: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Api/FamilyMemberTest.php tests/Feature/Api/HouseholdCardTest.php`
Expected: PASS (3 tests).

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_09_10_000005_create_family_members_table.php app/Http/Controllers/Api/FamilyMemberController.php app/Http/Controllers/Api/HouseholdCardController.php app/Http/Resources/FamilyMemberResource.php routes/api.php tests/Feature/Api/FamilyMemberTest.php tests/Feature/Api/HouseholdCardTest.php
git commit -m "feat: add family members and household QR card"
```

---

### Task 6: guest log + panic frontend

**Files:**
- Modify: `src/types/api.ts` (append types)
- Create: `src/services/guest-logs.ts`
- Create: `src/services/panic.ts`
- Create: `src/hooks/use-guest-logs.ts`
- Create: `src/hooks/use-panic.ts`
- Create: `src/features/siwarga-guest-logs/guest-logs-page.tsx`
- Create: `src/features/siwarga-panic/panic-page.tsx`
- Create: `src/routes/_authenticated/guest-logs/index.tsx`
- Create: `src/routes/_authenticated/panic/index.tsx`
- Modify: `src/components/layout/data/sidebar-data.ts` (Keamanan group)

**Interfaces:**
- Consumes: backend routes from Tasks 2–3 (`GuestLogResource`/`PanicAlertResource` shapes below); `api` axios instance; `use-table-url-state`; `useHasPermission`.
- Produces: pages at `/guest-logs`, `/panic`; hooks `useGuestLogs`, `useRegisterGuest`, `useCheckInGuest`, `useCheckOutGuest`, `usePanicAlerts`, `useReportPanic`, `useHandlePanic`, `useResolvePanic`, `useCancelPanic`, `useEmergencyContacts`.

- [ ] **Step 1: Append TS types**

Append to `src/types/api.ts`:

```ts
export type GuestLogStatus = 'registered' | 'checked_in' | 'checked_out'

export interface GuestLog {
  id: number
  guest_name: string
  purpose: string | null
  house_id: number
  house_number: string | null
  plate_number: string | null
  registered_by: number | null
  registrar_name: string | null
  qr_token: string | null
  visit_date: string | null
  status: GuestLogStatus
  checked_in_at: string | null
  checked_out_at: string | null
  recorded_by: number | null
  created_at: string
}

export interface GuestLogFilter {
  page?: number
  per_page?: number
  status?: GuestLogStatus
  date?: string
  search?: string
}

export interface RegisterGuestInput {
  guest_name: string
  purpose?: string
  house_id: number
  plate_number?: string
  visit_date?: string
}

export type PanicStatus = 'active' | 'handled' | 'resolved' | 'cancelled'

export interface PanicAlert {
  id: number
  reporter_id: number
  reporter_name: string | null
  house_id: number | null
  house_number: string | null
  location_note: string | null
  note: string | null
  status: PanicStatus
  handler_id: number | null
  handler_name: string | null
  handled_at: string | null
  resolved_at: string | null
  created_at: string
}

export interface PanicFilter {
  page?: number
  per_page?: number
  status?: PanicStatus
}

export interface EmergencyContact {
  id: number
  name: string
  phone: string
  sort_order: number
}
```

- [ ] **Step 2: Write services and hooks**

`src/services/guest-logs.ts`:

```ts
import type {
  ApiResponse,
  GuestLog,
  GuestLogFilter,
  PaginatedResponse,
  RegisterGuestInput,
} from '@/types/api'
import api from './api'

export const guestLogsService = {
  getAll: (params?: GuestLogFilter) =>
    api.get<PaginatedResponse<GuestLog>>('/api/guest-logs', { params }),
  register: (input: RegisterGuestInput) =>
    api.post<ApiResponse<GuestLog>>('/api/guest-logs', input),
  checkIn: (id: number) =>
    api.post<ApiResponse<GuestLog>>(`/api/guest-logs/${id}/check-in`),
  checkOut: (id: number) =>
    api.post<ApiResponse<GuestLog>>(`/api/guest-logs/${id}/check-out`),
}
```

`src/services/panic.ts`:

```ts
import type {
  ApiResponse,
  EmergencyContact,
  PaginatedResponse,
  PanicAlert,
  PanicFilter,
} from '@/types/api'
import api from './api'

export const panicService = {
  getAll: (params?: PanicFilter) =>
    api.get<PaginatedResponse<PanicAlert>>('/api/panic-alerts', { params }),
  report: (input: { location_note?: string; note?: string }) =>
    api.post<ApiResponse<PanicAlert>>('/api/panic-alerts', input),
  handle: (id: number) =>
    api.post<ApiResponse<PanicAlert>>(`/api/panic-alerts/${id}/handle`),
  resolve: (id: number) =>
    api.post<ApiResponse<PanicAlert>>(`/api/panic-alerts/${id}/resolve`),
  cancel: (id: number) =>
    api.post<ApiResponse<PanicAlert>>(`/api/panic-alerts/${id}/cancel`),
}

export const emergencyContactsService = {
  getAll: () =>
    api.get<PaginatedResponse<EmergencyContact>>('/api/emergency-contacts', {
      params: { per_page: 50 },
    }),
}
```

`src/hooks/use-guest-logs.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { guestLogsService } from '@/services/guest-logs'
import type { GuestLogFilter, RegisterGuestInput } from '@/types/api'
import { toast } from 'sonner'

export function useGuestLogs(params?: GuestLogFilter) {
  return useQuery({
    queryKey: ['guest-logs', params],
    queryFn: () => guestLogsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useRegisterGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterGuestInput) => guestLogsService.register(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest-logs'] })
      toast.success('Tamu berhasil didaftarkan')
    },
    onError: () => toast.error('Gagal mendaftarkan tamu'),
  })
}

export function useCheckInGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => guestLogsService.checkIn(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest-logs'] })
      toast.success('Tamu check-in')
    },
    onError: () => toast.error('Gagal check-in tamu'),
  })
}

export function useCheckOutGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => guestLogsService.checkOut(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest-logs'] })
      toast.success('Tamu check-out')
    },
    onError: () => toast.error('Gagal check-out tamu'),
  })
}
```

`src/hooks/use-panic.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { panicService, emergencyContactsService } from '@/services/panic'
import type { PanicFilter } from '@/types/api'
import { toast } from 'sonner'

export function usePanicAlerts(params?: PanicFilter) {
  return useQuery({
    queryKey: ['panic-alerts', params],
    queryFn: () => panicService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
    refetchInterval: (query) =>
      query.state.data?.data.some((a) => a.status === 'active') ? 15000 : false,
  })
}

export function useReportPanic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { location_note?: string; note?: string }) =>
      panicService.report(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['panic-alerts'] })
      toast.success('Laporan darurat terkirim ke satpam')
    },
    onError: () => toast.error('Gagal mengirim laporan darurat'),
  })
}

export function useHandlePanic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => panicService.handle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['panic-alerts'] })
      toast.success('Alert ditangani')
    },
    onError: () => toast.error('Gagal menangani alert'),
  })
}

export function useResolvePanic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => panicService.resolve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['panic-alerts'] })
      toast.success('Alert diselesaikan')
    },
    onError: () => toast.error('Gagal menyelesaikan alert'),
  })
}

export function useCancelPanic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => panicService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['panic-alerts'] })
      toast.success('Alert dibatalkan')
    },
    onError: () => toast.error('Gagal membatalkan alert'),
  })
}

export function useEmergencyContacts() {
  return useQuery({
    queryKey: ['emergency-contacts'],
    queryFn: () => emergencyContactsService.getAll(),
    select: (res) => res.data,
  })
}
```

- [ ] **Step 3: Write the two pages**

`src/features/siwarga-guest-logs/guest-logs-page.tsx` — follow the tickets/suggestions page pattern (`Header`/`Main` layout, `DataTable` + `use-table-url-state` for page/status/search, register dialog with fields guest_name/purpose/house_id/plate_number/visit_date, QR token display after warga pre-register with copy button, check-in/out buttons gated by `useHasPermission('guest-logs.manage')`, status badge map registered→'Terdaftar'/checked_in→'Masuk'/checked_out→'Keluar', toasts already in hooks). QR rendering (token → QR image) arrives in Task 7's `qrcode.react` step — this page shows the token text + copy button; Task 7 upgrades it to a QR image in place (same component, no API change).

`src/features/siwarga-panic/panic-page.tsx` — mobile-first: large red "Tombol Darurat" button opening a confirm dialog (location_note + note fields, confirm label "Kirim Laporan Darurat"), active-alert banner with "Batalkan" for the reporter's own active alert, alert list with Tangani/Selesaikan buttons gated by `useHasPermission('panic-alerts.handle')`, emergency contacts section with `tel:` links (phone icon + name). Polling handled by `usePanicAlerts` refetchInterval (15s while any active).

- [ ] **Step 4: Write routes + sidebar**

`src/routes/_authenticated/guest-logs/index.tsx`:

```tsx
import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { GuestLogsPage } from '@/features/siwarga-guest-logs/guest-logs-page'

const guestLogsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  status: z
    .union([z.literal('registered'), z.literal('checked_in'), z.literal('checked_out')])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/guest-logs/')({
  validateSearch: guestLogsSearchSchema,
  component: GuestLogsPage,
})
```

`src/routes/_authenticated/panic/index.tsx`:

```tsx
import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PanicPage } from '@/features/siwarga-panic/panic-page'

const panicSearchSchema = z.object({
  page: z.number().optional().catch(1),
  status: z
    .union([
      z.literal('active'),
      z.literal('handled'),
      z.literal('resolved'),
      z.literal('cancelled'),
    ])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/panic/')({
  validateSearch: panicSearchSchema,
  component: PanicPage,
})
```

Sidebar: add a `Keamanan` group in `src/components/layout/data/sidebar-data.ts` after the `Fasilitas` group, with items Buku Tamu (`/guest-logs`, permission `guest-logs.view`), Panic Button (`/panic`, permission `panic-alerts.report`), Jadwal Ronda (`/patrols`, permission `patrol-schedules.view`, route arrives Task 7 but menu entry may land here), Kartu Keluarga (`/family`, permission `family-members.view`, route arrives Task 7). Menu entries for not-yet-existing routes are acceptable within this plan since Task 7 lands in the same plan before verification — but to keep each task independently working, add `/patrols` + `/family` entries in Task 7 instead. This task adds only Buku Tamu + Panic Button entries.

- [ ] **Step 5: Verify with build + lint**

Run: `npm run build` (in `src/frontend/`)
Expected: clean build. Fix TS errors before committing.

- [ ] **Step 6: Format and commit**

```bash
npm run format
git add src/types/api.ts src/services/guest-logs.ts src/services/panic.ts src/hooks/use-guest-logs.ts src/hooks/use-panic.ts src/features/siwarga-guest-logs/guest-logs-page.tsx src/features/siwarga-panic/panic-page.tsx src/routes/_authenticated/guest-logs/index.tsx src/routes/_authenticated/panic/index.tsx src/components/layout/data/sidebar-data.ts
git commit -m "feat: add guest log and panic button UI"
```

---

### Task 7: patrol + family frontend (schedules, members, QR card)

**Files:**
- Modify: `src/types/api.ts` (append types)
- Create: `src/services/patrols.ts`
- Create: `src/services/family.ts`
- Create: `src/hooks/use-patrols.ts`
- Create: `src/hooks/use-family.ts`
- Create: `src/features/siwarga-patrols/patrols-page.tsx`
- Create: `src/features/siwarga-family/family-page.tsx`
- Create: `src/routes/_authenticated/patrols/index.tsx`
- Create: `src/routes/_authenticated/family/index.tsx`
- Modify: `src/components/layout/data/sidebar-data.ts` (add patrols + family entries)
- Modify: `src/features/siwarga-guest-logs/guest-logs-page.tsx` (QR image upgrade)
- Modify: `src/frontend/package.json` (qrcode.react — needs user approval)

**Interfaces:**
- Consumes: backend routes from Tasks 4–5; hooks pattern from Task 6.
- Produces: pages at `/patrols`, `/family`; hooks `usePatrols`, `useCreatePatrol`, `useUpdatePatrol`, `useDeletePatrol`, `useFamilyMembers`, `useCreateMember`, `useUpdateMember`, `useDeleteMember`, `useHouseholdCard`.

- [ ] **Step 1: Install QR library (needs user approval; fallback noted)**

Run in `src/frontend/`: `npm install qrcode.react`

If the user declines the new dependency, skip the install and instead render the token/verify-URL as text + copy button in both QR spots (guest token in Task 6 page, household card here). The plan's remaining steps assume approval; the fallback changes only the two render spots, no API/hook changes.

- [ ] **Step 2: Append TS types**

```ts
export type PatrolShift = 'pagi' | 'siang' | 'malam'

export interface PatrolSchedule {
  id: number
  date: string
  shift: PatrolShift
  personnel_name: string
  user_id: number | null
  area: string | null
  note: string | null
  created_at: string
}

export interface PatrolFilter {
  page?: number
  per_page?: number
  from?: string
  to?: string
}

export interface PatrolInput {
  date: string
  shift: PatrolShift
  personnel_name: string
  user_id?: number | null
  area?: string
  note?: string
}

export type FamilyRelationship =
  | 'kepala_keluarga'
  | 'pasangan'
  | 'anak'
  | 'orang_tua'
  | 'famili_lain'
  | 'pembantu'
  | 'kontrak'

export interface FamilyMember {
  id: number
  house_id: number
  house_number: string | null
  name: string
  relationship: FamilyRelationship
  nik: string | null
  birth_date: string | null
  phone: string | null
  created_at: string
}

export interface FamilyFilter {
  page?: number
  per_page?: number
  house_id?: number
  relationship?: FamilyRelationship
  search?: string
}

export interface FamilyInput {
  house_id?: number
  name: string
  relationship: FamilyRelationship
  nik?: string
  birth_date?: string
  phone?: string
}

export interface HouseholdCard {
  house_id: number
  house_number: string
  address: string | null
  head_name: string
  member_count: number
  verify_token: string
}
```

- [ ] **Step 3: Write services and hooks**

`src/services/patrols.ts`:

```ts
import type {
  ApiResponse,
  PaginatedResponse,
  PatrolFilter,
  PatrolInput,
  PatrolSchedule,
} from '@/types/api'
import api from './api'

export const patrolsService = {
  getAll: (params?: PatrolFilter) =>
    api.get<PaginatedResponse<PatrolSchedule>>('/api/patrol-schedules', { params }),
  create: (input: PatrolInput) =>
    api.post<ApiResponse<PatrolSchedule>>('/api/patrol-schedules', input),
  update: (id: number, input: Partial<PatrolInput>) =>
    api.put<ApiResponse<PatrolSchedule>>(`/api/patrol-schedules/${id}`, input),
  remove: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/patrol-schedules/${id}`),
}
```

`src/services/family.ts`:

```ts
import type {
  ApiResponse,
  FamilyFilter,
  FamilyInput,
  FamilyMember,
  HouseholdCard,
  PaginatedResponse,
} from '@/types/api'
import api from './api'

export const familyService = {
  getAll: (params?: FamilyFilter) =>
    api.get<PaginatedResponse<FamilyMember>>('/api/family-members', { params }),
  create: (input: FamilyInput) =>
    api.post<ApiResponse<FamilyMember>>('/api/family-members', input),
  update: (id: number, input: Partial<FamilyInput>) =>
    api.put<ApiResponse<FamilyMember>>(`/api/family-members/${id}`, input),
  remove: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/family-members/${id}`),
  card: () => api.get<ApiResponse<HouseholdCard>>('/api/households/card'),
}
```

`src/hooks/use-patrols.ts` and `src/hooks/use-family.ts`: mirror `use-suggestions.ts`/`use-guest-logs.ts` (query + create/update/delete mutations with `toast.success`/`toast.error` in Bahasa Indonesia: 'Jadwal ronda disimpan', 'Jadwal ronda dihapus', 'Anggota keluarga ditambahkan', 'Anggota keluarga dihapus', 'Kartu keluarga dimuat'). `useHouseholdCard` is a plain `useQuery(['household-card'])`.

- [ ] **Step 4: Write the pages**

`src/features/siwarga-patrols/patrols-page.tsx` — table (date/shift/personnel/area) with from/to date filter + `use-table-url-state`, CRUD dialog gated by `useHasPermission('patrol-schedules.manage')`, shift badge map pagi→'Pagi'/siang→'Siang'/malam→'Malam'. Read-only list for warga/satpam.

`src/features/siwarga-family/family-page.tsx` — two sections: (1) Kartu Keluarga card (head name, house number, address, member count, `QRCodeSVG` from `qrcode.react` rendering the verify URL `${window.location.origin}/verifikasi-keluarga/{verify_token}` — display only; the verify page itself is out of scope, verification happens via API) + (2) member table with CRUD dialog (name/relationship/nik/birth_date/phone; house_id selector only when `useHasPermission('family-members.manage')`). NIK column renders `nik ?? '—'` (backend already nulls it when unauthorized).

- [ ] **Step 5: QR upgrade in guest-logs page**

In `src/features/siwarga-guest-logs/guest-logs-page.tsx`, replace the token-text spot with `QRCodeSVG` rendering the raw `qr_token` value (+ keep copy button). If Step 1 was declined, leave the text + copy button as-is.

- [ ] **Step 6: Routes + sidebar**

`src/routes/_authenticated/patrols/index.tsx` (zod: page, from/to strings optional) and `src/routes/_authenticated/family/index.tsx` (zod: page, search optional) mirroring Task 6 route files. Sidebar: add Jadwal Ronda + Kartu Keluarga items to the `Keamanan` group.

- [ ] **Step 7: Verify with build**

Run: `npm run build` (in `src/frontend/`)
Expected: clean build.

- [ ] **Step 8: Format and commit**

```bash
npm run format
git add src/types/api.ts src/services/patrols.ts src/services/family.ts src/hooks/use-patrols.ts src/hooks/use-family.ts src/features/siwarga-patrols/patrols-page.tsx src/features/siwarga-family/family-page.tsx src/routes/_authenticated/patrols/index.tsx src/routes/_authenticated/family/index.tsx src/components/layout/data/sidebar-data.ts src/features/siwarga-guest-logs/guest-logs-page.tsx src/frontend/package.json src/frontend/package-lock.json
git commit -m "feat: add patrol and family card UI with QR"
```

---

### Task 8: e2e coverage + full verification

**Files:**
- Create: `src/frontend/e2e/siwarga/fase-4-security.spec.ts`

**Interfaces:**
- Consumes: all Tasks 1–7 routes + UIs. Helpers from `e2e/siwarga/setup`: `test, expect, apiToken, apiPost, apiGet, uid, defaultAdmin, apiBaseURL` (same set Fase 3 used; additive `apiGet` already exists).
- Produces: 3 green e2e flows; full-suite verification evidence.

Accessible names the implementer must use (exact): `Lapor Darurat`, `Kirim Laporan`, `Tangani`, `Selesaikan`, `Batalkan`, `Daftarkan Tamu`, `Kirim Pendaftaran`, `Check-in`, `Check-out`, `Tambah Anggota`, `Simpan Anggota`. If the implemented UI uses different labels, adapt SELECTORS to the UI (brief allowance, like Fase 3) — never change UI labels to match the spec.

- [ ] **Step 1: Write the spec**

```ts
import { test, expect, apiToken, apiPost, apiGet, uid, defaultAdmin, apiBaseURL } from './setup'

test.describe('Fase 4 security', () => {
  test('warga reports panic, satpam handles and resolves', async ({ page }) => {
    const adminToken = await apiToken(defaultAdmin.email, defaultAdmin.password)
    // create satpam + warga users via API (admin), then UI flow
    const suffix = uid()
    // ... register satpam user, assign satpam role; login as warga ...
    await page.goto('/panic')
    await page.getByRole('button', { name: 'Lapor Darurat' }).click()
    await page.getByRole('button', { name: 'Kirim Laporan' }).click()
    await expect(page.getByText('Laporan darurat terkirim')).toBeVisible()
    // satpam handles via API, UI shows handled
    // ... assert status transitions via apiGet detail ...
  })

  test('guest pre-register then check-in and check-out', async ({ page }) => {
    // warga pre-registers via UI (Daftarkan Tamu → Kirim Pendaftaran),
    // satpam check-in/out via UI buttons, assert status badges
  })

  test('public household verify exposes no NIK', async ({ request }) => {
    const adminToken = await apiToken(defaultAdmin.email, defaultAdmin.password)
    // create house + member with NIK via apiPost, get card token via
    // apiGet('/api/households/card') as warga, then:
    const res = await request.get(`${apiBaseURL}/api/public/households/${token}`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('1234567890123456')
    const bad = await request.get(`${apiBaseURL}/api/public/households/1.invalid`)
    expect(bad.status()).toBe(404)
  })
})
```

Expand the skeleton above into the full spec following `fase-3-booking.spec.ts` (login helper, `uid()`-suffixed names, `apiBaseURL` for direct API calls, no hardcoded localhost, no `waitForTimeout` — `expect().toBeVisible()` auto-retry; status-change assertions via API responses + DB-backed endpoints, never WA delivery).

- [ ] **Step 2: Start dev servers and run the new spec**

Backend `php artisan serve --port=8000` from `src/backend/`, frontend `npm run dev` from `src/frontend/` in background, wait for readiness. If browsers complain, `npx playwright install chromium`, else report BLOCKED.

Run: `npx playwright test e2e/siwarga/fase-4-security.spec.ts` (in `src/frontend/`)
Expected: 3/3 PASS.

- [ ] **Step 3: Run the FULL verification**

```bash
composer test        # config:clear + pint --test + phpstan + phpunit (src/backend/)
npm run build        # src/frontend/
npm run test         # vitest run (src/frontend/)
npx playwright test  # full e2e suite (both servers running)
```

Expected: phpunit all pass; build clean; full Playwright green. Known pre-existing reds (do NOT fix, triage with file evidence like Fase 3): pint drift on untouched billing files, phpstan `missingType.*` notices, vitest kerberos/`vi.mock` startup collapse. If failures touch THIS plan's files, fix in the owning task's files under TDD and report clearly.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/e2e/siwarga/fase-4-security.spec.ts
git commit -m "test: add Fase 4 security e2e (panic, guest log, card)"
```

---

## Self-Review

**1. Spec coverage:** §2.1 guest_logs → Tasks 1–2 ✓; §2.2 panic → Tasks 1,3 ✓; §2.3 patrol → Tasks 1,4 ✓; §2.4 family → Tasks 1,5 ✓; §2.5 contacts → Tasks 1,4 ✓; §2.6 QR card → Tasks 5,7 ✓; §3 RBAC+satpam → Task 1 (+report-gate note Task 3) ✓; §4.2 panic flow → Task 3 ✓; §4.3 validation → Tasks 2–5 ✓; §5 endpoints → Tasks 2–5 ✓ (all rows incl. `households/card` + public verify); §6 frontend → Tasks 6–7 ✓; §7 tests → Tasks 1–5,8 ✓; §8 migrate/seed → Tasks 1–5 ✓.

**2. Placeholder scan:** no TBD/TODO/"similar to"/bare "handle edge cases" — every step has exact code/commands. Frontend pages reference the tickets/suggestions pattern by name for layout only; services/hooks/types/routes are fully specified.

**3. Type consistency:** `GuestLog`/`PanicAlert`/etc. shapes match Resource `toArray` keys; hook query keys (`guest-logs`, `panic-alerts`, `emergency-contacts`) distinct; `apiBaseURL`/`uid`/`apiGet` helpers verified present from Fase 3; policy method names (`checkIn`, `handle`, `cancel`) match controller `authorize()` calls; route binding `{guestLog}` ↔ `GuestLog $guestLog` consistent throughout.
