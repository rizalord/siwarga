# SIWarga v1 Gap Closure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical and moderate gaps in SIWarga v1: RBAC enforcement, API endpoint mismatches, missing seeders, house status auto-sync, and missing tests.

**Architecture:** Backend-first fixes (RBAC policies, User model permissions) then frontend endpoint alignment, then seeders, then data integrity, then tests. Each task is independently testable.

**Tech Stack:** Laravel 13 (backend), React 19 + TypeScript + Vite (frontend), PHPUnit, Vitest

## Global Constraints

- All changes must preserve existing 73 passing backend tests
- Frontend must compile with `npx tsc --noEmit` with zero errors
- Permission format: `{module}.{action}` (e.g., `residents.create`)
- All existing API contracts remain unchanged unless explicitly modified
- No new features beyond what's in the gap closure spec

---

## File Structure

### Modified files (Backend)
- `src/backend/app/Models/User.php` — add `getAllPermissions()`, fix `permissions()` relationship
- `src/backend/app/Http/Controllers/Api/AuthController.php` — return real permissions
- `src/backend/routes/api.php` — add permission middleware to all route groups
- `src/backend/database/seeders/DatabaseSeeder.php` — add DueTypeSeeder + default user
- `src/backend/app/Models/House.php` — add auto-sync boot() logic

### New files (Backend)
- `src/backend/database/seeders/DueTypeSeeder.php` — seed default due types
- `src/backend/tests/Feature/Api/DueTypeTest.php` — CRUD tests
- `src/backend/tests/Feature/Api/RbacTest.php` — 403 enforcement + Warga scope tests

### Modified files (Frontend)
- `src/frontend/src/services/houses.ts` — fix endpoint URLs
- `src/frontend/src/services/reports.ts` — fix endpoint URLs
- `src/frontend/src/routes/_authenticated/index.tsx` — use siwarga-dashboard

---

### Task 1: Fix RBAC Enforcement & Permissions

**Files:**
- Modify: `src/backend/app/Models/User.php`
- Modify: `src/backend/app/Http/Controllers/Api/AuthController.php`
- Modify: `src/backend/routes/api.php`

**Interfaces:**
- Consumes: Existing Role, Permission models
- Produces: `User::getAllPermissions(): array` — returns string array of permission names

- [ ] **Step 1: Fix User model — add `getAllPermissions()` and fix `permissions()` relationship**

Edit `src/backend/app/Models/User.php`:

The existing `permissions()` relationship is wrong — it queries `role_permissions` directly instead of going through `user_roles`. Replace it with a proper method:

```php
// REMOVE the old permissions() BelongsToMany (lines 53-56)
// REPLACE with:

public function getAllPermissions(): array
{
    return $this->roles()
        ->with('permissions')
        ->get()
        ->pluck('permissions')
        ->flatten()
        ->pluck('name')
        ->unique()
        ->values()
        ->toArray();
}
```

- [ ] **Step 2: Fix AuthController — return real permissions in login and me**

Edit `src/backend/app/Http/Controllers/Api/AuthController.php`:

In `login()` method (line 34), change:
```php
'permissions' => [],
```
to:
```php
'permissions' => $user->getAllPermissions(),
```

In `me()` method (line 60), change:
```php
'permissions' => [],
```
to:
```php
'permissions' => $request->user()->getAllPermissions(),
```

- [ ] **Step 3: Add RBAC middleware to API routes**

Edit `src/backend/routes/api.php`. Wrap each resource group with permission middleware:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Residents — Admin only
    Route::middleware('can:residents.view')->group(function () {
        Route::get('/residents', [ResidentController::class, 'index']);
        Route::get('/residents/{resident}', [ResidentController::class, 'show']);
    });
    Route::post('/residents', [ResidentController::class, 'store'])->middleware('can:residents.create');
    Route::put('/residents/{resident}', [ResidentController::class, 'update'])->middleware('can:residents.edit');
    Route::delete('/residents/{resident}', [ResidentController::class, 'destroy'])->middleware('can:residents.delete');

    // Houses
    Route::middleware('can:houses.view')->group(function () {
        Route::get('/houses', [HouseController::class, 'index']);
        Route::get('/houses/{house}', [HouseController::class, 'show']);
        Route::get('/houses/{house}/history', [HouseController::class, 'history']);
    });
    Route::post('/houses', [HouseController::class, 'store'])->middleware('can:houses.create');
    Route::put('/houses/{house}', [HouseController::class, 'update'])->middleware('can:houses.edit');
    Route::delete('/houses/{house}', [HouseController::class, 'destroy'])->middleware('can:houses.delete');
    Route::post('/houses/{house}/assign-resident', [HouseController::class, 'assignResident'])->middleware('can:houses.assign');

    // Due Types
    Route::middleware('can:due-types.view')->group(function () {
        Route::get('/due-types', [DueTypeController::class, 'index']);
        Route::get('/due-types/{due_type}', [DueTypeController::class, 'show']);
    });
    Route::middleware('can:due-types.manage')->group(function () {
        Route::post('/due-types', [DueTypeController::class, 'store']);
        Route::put('/due-types/{due_type}', [DueTypeController::class, 'update']);
        Route::delete('/due-types/{due_type}', [DueTypeController::class, 'destroy']);
    });

    // Bills
    Route::middleware('can:bills.view')->group(function () {
        Route::get('/bills', [BillController::class, 'index']);
        Route::get('/bills/{bill}', [BillController::class, 'show']);
    });
    Route::post('/bills/generate', [BillController::class, 'generate'])->middleware('can:bills.generate');
    Route::delete('/bills/{bill}', [BillController::class, 'destroy'])->middleware('can:bills.view');

    // Payments
    Route::middleware('can:payments.view')->group(function () {
        Route::get('/payments', [PaymentController::class, 'index']);
        Route::get('/payments/{payment}', [PaymentController::class, 'show']);
    });
    Route::post('/payments', [PaymentController::class, 'store'])->middleware('can:payments.create');

    // Expenses
    Route::middleware('can:expenses.view')->group(function () {
        Route::get('/expenses', [ExpenseController::class, 'index']);
        Route::get('/expenses/{expense}', [ExpenseController::class, 'show']);
    });
    Route::middleware('can:expenses.create')->group(function () {
        Route::post('/expenses', [ExpenseController::class, 'store']);
    });
    Route::middleware('can:expenses.edit')->group(function () {
        Route::put('/expenses/{expense}', [ExpenseController::class, 'update']);
    });
    Route::middleware('can:expenses.delete')->group(function () {
        Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy']);
    });

    // Reports
    Route::get('/reports/summary/{year}', [ReportController::class, 'summary'])->middleware('can:reports.view');
    Route::get('/reports/monthly/{year}/{month}', [ReportController::class, 'monthly'])->middleware('can:reports.view');

    // Users — Admin only
    Route::middleware('can:users.view')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
    });
    Route::middleware('can:users.manage')->group(function () {
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
    });
    Route::get('/roles', [RoleController::class, 'index'])->middleware('can:users.view');
});
```

- [ ] **Step 4: Run PHPUnit to verify existing tests still pass**

Run: `cd src/backend && php artisan test --compact`
Expected: All tests pass (the existing tests use `User::factory()->create()` which creates users without roles, so they may need the `admin` role to pass the new middleware checks)

Note: Existing tests create users via `User::factory()->create()` which doesn't assign any role. The new middleware will block these users. Fix: each test that `actingAs()` a user must assign the `admin` role or the specific permission needed.

- [ ] **Step 5: Fix existing tests to work with RBAC middleware**

Each test that creates a user and actsAs them needs to assign appropriate roles/permissions. Add this helper to each test file:

```php
use App\Models\Role;
use App\Models\Permission;

beforeEach(function () {
    $this->admin = User::factory()->create();
    $adminRole = Role::where('name', 'admin')->first();
    if ($adminRole) {
        $this->admin->roles()->attach($adminRole->id);
    }
});
```

Then replace `$this->user` with `$this->admin` in all existing tests, or use `$this->admin` as the acting user.

Run: `cd src/backend && php artisan test --compact`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/Models/User.php src/backend/app/Http/Controllers/Api/AuthController.php src/backend/routes/api.php
git commit -m "fix(rbac): enforce policies via route middleware, fix permissions response"
```

---

### Task 2: Fix Frontend Service Endpoints

**Files:**
- Modify: `src/frontend/src/services/houses.ts`
- Modify: `src/frontend/src/services/reports.ts`

**Interfaces:**
- Consumes: Existing service interfaces from `src/types/api.ts`
- Produces: Correct API URLs matching backend routes

- [ ] **Step 1: Fix houses service URLs**

Edit `src/frontend/src/services/houses.ts`:

```typescript
// Line 16: change getResidents URL
getResidents: (id: number) =>
    api.get<ApiResponse<HouseResident[]>>(`/api/houses/${id}/history`),

// Line 18: change assignResident URL
assignResident: (id: number, data: AssignResidentRequest) =>
    api.post<ApiResponse<HouseResident>>(`/api/houses/${id}/assign-resident`, data),
```

- [ ] **Step 2: Fix reports service URLs**

Edit `src/frontend/src/services/reports.ts`:

```typescript
// Line 6: change getMonthly URL from query params to path params
getMonthly: (year: number, month: number) =>
    api.get<ApiResponse<MonthlyReport>>(`/api/reports/monthly/${year}/${month}`),

// Line 9: change getYearly URL from /yearly?year= to /summary/{year}
getYearly: (year: number) =>
    api.get<ApiResponse<YearlySummary>>(`/api/reports/summary/${year}`),
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd src/frontend && npx tsc --noEmit --pretty`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/services/houses.ts src/frontend/src/services/reports.ts
git commit -m "fix(api): align frontend service URLs with backend routes"
```

---

### Task 3: Fix Dashboard Route & Add Seeders

**Files:**
- Modify: `src/frontend/src/routes/_authenticated/index.tsx`
- Create: `src/backend/database/seeders/DueTypeSeeder.php`
- Modify: `src/backend/database/seeders/DatabaseSeeder.php`

**Interfaces:**
- Consumes: `DashboardPage` from `@/features/siwarga-dashboard`
- Produces: Seed data for due types and default admin user

- [ ] **Step 1: Fix dashboard route to use SIWarga dashboard**

Edit `src/frontend/src/routes/_authenticated/index.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/features/siwarga-dashboard'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})
```

- [ ] **Step 2: Create DueTypeSeeder**

Create `src/backend/database/seeders/DueTypeSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\DueType;
use Illuminate\Database\Seeder;

class DueTypeSeeder extends Seeder
{
    public function run(): void
    {
        DueType::create([
            'name' => 'Iuran Satpam',
            'amount' => 100000,
            'billing_cycle' => 'bulanan',
        ]);

        DueType::create([
            'name' => 'Iuran Kebersihan',
            'amount' => 15000,
            'billing_cycle' => 'bulanan',
        ]);
    }
}
```

- [ ] **Step 3: Update DatabaseSeeder with default admin user and DueTypeSeeder**

Edit `src/backend/database/seeders/DatabaseSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            DueTypeSeeder::class,
        ]);

        // Create default admin user
        $admin = User::create([
            'name' => 'Admin RT',
            'email' => 'admin@siwarga.test',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

        $adminRole = Role::where('name', 'admin')->first();
        if ($adminRole) {
            $admin->roles()->attach($adminRole->id);
        }
    }
}
```

- [ ] **Step 4: Verify seeders work**

Run: `cd src/backend && php artisan migrate:fresh --seed --force`
Expected: Database seeded with roles, permissions, due types, and admin user

Run: `cd src/backend && php artisan tinker --execute 'echo \App\Models\DueType::count();'`
Expected: `2`

Run: `cd src/backend && php artisan tinker --execute 'echo \App\Models\User::where("email","admin@siwarga.test")->count();'`
Expected: `1`

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd src/frontend && npx tsc --noEmit --pretty`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/routes/_authenticated/index.tsx src/backend/database/seeders/
git commit -m "fix: wire SIWarga dashboard, add DueTypeSeeder and default admin user"
```

---

### Task 4: House Status Auto-Sync

**Files:**
- Modify: `src/backend/app/Models/House.php`

**Interfaces:**
- Consumes: Existing House, HouseResident models
- Produces: Auto-synced house status via model events

- [ ] **Step 1: Add auto-sync boot() method to House model**

Edit `src/backend/app/Models/House.php` — add `protected static function booted()`:

```php
use Illuminate\Database\Eloquent\Relations\HasMany;

// Add this method inside the class:
protected static function booted(): void
{
    static::saved(function (House $house) {
        // Check if house has any active residents (no end_date)
        $hasActiveResident = $house->houseResidents()
            ->whereNull('end_date')
            ->exists();

        $correctStatus = $hasActiveResident ? 'dihuni' : 'kosong';

        // Only update if status actually changed (avoid infinite loop)
        if ($house->status !== $correctStatus) {
            House::withoutEvents(function () use ($house, $correctStatus) {
                $house->updateQuietly(['status' => $correctStatus]);
            });
        }
    });
}
```

- [ ] **Step 2: Run existing house tests**

Run: `cd src/backend && php artisan test --filter HouseTest`
Expected: All pass

- [ ] **Step 3: Verify auto-sync works via tinker**

Run: `cd src/backend && php artisan tinker --execute '$house = \App\Models\House::factory()->create(["status" => "kosong"]); $resident = \App\Models\Resident::factory()->create(); $house->houseResidents()->create(["resident_id" => $resident->id, "start_date" => "2026-07-01"]); $house->refresh(); echo $house->status;'`
Expected: `dihuni`

- [ ] **Step 4: Commit**

```bash
git add src/backend/app/Models/House.php
git commit -m "fix(models): auto-sync house status from active residents"
```

---

### Task 5: Add Missing Backend Tests

**Files:**
- Create: `src/backend/tests/Feature/Api/DueTypeTest.php`
- Create: `src/backend/tests/Feature/Api/RbacTest.php`

**Interfaces:**
- Consumes: `RolePermissionSeeder` (seeded DB), models, middleware
- Produces: DueType CRUD tests, RBAC 403 enforcement test, Warga scope test

- [ ] **Step 1: Create DueTypeTest.php**

Create `src/backend/tests/Feature/Api/DueTypeTest.php`:

```php
<?php

namespace Tests\Feature\Api;

use App\Models\DueType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DueTypeTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->admin = User::factory()->create();
        $adminRole = Role::where('name', 'admin')->first();
        $this->admin->roles()->attach($adminRole->id);
    }

    public function test_can_list_due_types(): void
    {
        DueType::factory()->count(3)->create();

        $response = $this->actingAs($this->admin)->getJson('/api/due-types');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_can_create_due_type(): void
    {
        $data = [
            'name' => 'Iuran Parkir',
            'amount' => 50000,
            'billing_cycle' => 'bulanan',
        ];

        $response = $this->actingAs($this->admin)
            ->postJson('/api/due-types', $data);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Iuran Parkir');
    }

    public function test_validates_required_fields(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/due-types', []);

        $response->assertStatus(422);
    }

    public function test_can_update_due_type(): void
    {
        $dueType = DueType::factory()->create(['amount' => 50000]);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/due-types/{$dueType->id}", ['amount' => 75000]);

        $response->assertStatus(200)
            ->assertJsonPath('data.amount', 75000);
    }

    public function test_can_soft_delete_due_type(): void
    {
        $dueType = DueType::factory()->create();

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/due-types/{$dueType->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted($dueType);
    }
}
```

- [ ] **Step 2: Create RbacTest.php**

Create `src/backend/tests/Feature/Api/RbacTest.php`:

```php
<?php

namespace Tests\Feature\Api;

use App\Models\DueType;
use App\Models\House;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $bendahara;
    private User $warga;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->admin = User::factory()->create(['name' => 'Admin']);
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);

        $this->bendahara = User::factory()->create(['name' => 'Bendahara']);
        $this->bendahara->roles()->attach(Role::where('name', 'bendahara')->first()->id);

        $this->warga = User::factory()->create(['name' => 'Warga']);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
    }

    public function test_warga_cannot_create_resident(): void
    {
        $response = $this->actingAs($this->warga)
            ->postJson('/api/residents', [
                'full_name' => 'Test',
                'status' => 'tetap',
                'phone_number' => '08123456789',
                'marital_status' => 'menikah',
            ]);

        $response->assertStatus(403);
    }

    public function test_warga_cannot_create_due_type(): void
    {
        $response = $this->actingAs($this->warga)
            ->postJson('/api/due-types', [
                'name' => 'Test',
                'amount' => 10000,
                'billing_cycle' => 'bulanan',
            ]);

        $response->assertStatus(403);
    }

    public function test_bendahara_cannot_manage_users(): void
    {
        $response = $this->actingAs($this->bendahara)
            ->getJson('/api/users');

        $response->assertStatus(403);
    }

    public function test_warga_cannot_generate_bills(): void
    {
        $response = $this->actingAs($this->warga)
            ->postJson('/api/bills/generate', [
                'month' => 7,
                'year' => 2026,
            ]);

        $response->assertStatus(403);
    }

    public function test_warga_can_view_bills(): void
    {
        $response = $this->actingAs($this->warga)
            ->getJson('/api/bills');

        $response->assertStatus(200);
    }

    public function test_admin_can_manage_users(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/users');

        $response->assertStatus(200);
    }

    public function test_bendahara_can_view_reports(): void
    {
        $response = $this->actingAs($this->bendahara)
            ->getJson('/api/reports/summary/2026');

        $response->assertStatus(200);
    }
}
```

- [ ] **Step 3: Fix existing tests to work with RBAC middleware**

The existing tests (ResidentTest, HouseTest, BillTest, PaymentTest, ExpenseTest, ReportTest, UserTest) create users via `User::factory()->create()` which has no roles. Update each test's `setUp()` to assign the admin role.

For each test file, add at the top:

```php
use App\Models\Role;
```

And in `setUp()` or `beforeEach()`:

```php
$this->user = User::factory()->create();
$adminRole = Role::where('name', 'admin')->first();
if ($adminRole) {
    $this->user->roles()->attach($adminRole->id);
}
```

The tests that need updating:
- `ResidentTest.php` — already has `beforeEach()` creating user, add role assignment
- `HouseTest.php` — same pattern
- `BillTest.php` — same pattern
- `PaymentTest.php` — same pattern
- `ExpenseTest.php` — same pattern
- `ReportTest.php` — same pattern
- `UserTest.php` — same pattern

- [ ] **Step 4: Run full PHPUnit suite**

Run: `cd src/backend && php artisan test --compact`
Expected: All tests pass (including new DueType tests and RBAC tests)

- [ ] **Step 5: Commit**

```bash
git add src/backend/tests/Feature/Api/DueTypeTest.php src/backend/tests/Feature/Api/RbacTest.php
git commit -m "test: add DueType CRUD tests and RBAC enforcement tests"
```

Then separately commit the existing test fixes:

```bash
# After updating all existing tests with role assignment
git add src/backend/tests/Feature/Api/
git commit -m "fix(tests): assign admin role to test users for RBAC middleware"
```

---

## Self-Review Checklist

1. **Spec coverage:** Does every gap in the spec have a corresponding task? Yes — C1-7 → Task 1-3, M1 → Task 3, M2-3 → Task 5, M4 → Task 4.
2. **Placeholder scan:** No TBD, no "implement later", all code is literal.
3. **Type consistency:** House model uses `updateQuietly()` and `withoutEvents()` consistently. Test patterns use the same `setUp()` pattern. All service method names match existing interfaces.
