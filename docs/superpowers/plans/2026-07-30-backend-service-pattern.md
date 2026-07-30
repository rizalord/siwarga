# Backend Service Pattern Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract business logic out of all 13 `src/backend/app/Http/Controllers/Api/*Controller.php` classes into per-resource `app/Services/*Service.php` classes, so controllers only validate input, call a Service, and shape the response.

**Architecture:** One Service class per resource, injected into its controller via constructor (Laravel's container auto-resolves concrete classes, no binding needed). Each Service method receives already-validated data (arrays/models/scalars) and returns models/collections — it never touches `Request` or HTTP response shaping. Existing `BillGenerationService` and `ReportService` are unchanged and untouched by this plan.

**Tech Stack:** Laravel 13, PHPUnit, `RefreshDatabase`, existing `Database\Seeders\PermissionSeeder`/`RoleSeeder`.

## Global Constraints

- Controllers keep doing `$request->validate([...])` inline — no Form Request classes introduced (out of scope per design doc `docs/superpowers/specs/2026-07-30-backend-service-pattern-design.md`).
- Base `app/Http/Controllers/Controller.php` helpers (`paginated`, `applySorting`, `applyTrashedFilter`, `bulkDelete`, `bulkRestore`/`bulkRestoreWithCallback`, `bulkForceDelete`, `restoreModel`, `forceDeleteModel`) stay as-is — out of scope.
- No response shape, status code, or validation message may change — every existing Feature test in `tests/Feature/Api/*Test.php` must keep passing unmodified.
- Run `vendor/bin/pint --dirty --format agent` on changed PHP files before each commit (per `CLAUDE.md`).
- Run `phpstan analyse` after each task; fix any new errors introduced by the extraction before moving on.
- Every task's commit message and code: no comments explaining *what* the code does — only *why*, and only if genuinely non-obvious (existing code has none of this kind, so new Services should match).

---

## Task 1: `AuthService` + thin `AuthController`

**Files:**
- Create: `src/backend/app/Services/AuthService.php`
- Modify: `src/backend/app/Http/Controllers/Api/AuthController.php`
- Test: `src/backend/tests/Feature/Api/AuthTest.php` (no edits expected — used as regression check)

**Interfaces:**
- Produces: `AuthService::login(string $email, string $password): array` (`['user' => User, 'token' => string, 'permissions' => Collection]`, throws `ValidationException` on bad credentials), `AuthService::logout(User $user): void`, `AuthService::refresh(User $user): string`, `AuthService::me(User $user): array` (`['user' => User, 'permissions' => Collection]`)

- [ ] **Step 1: Confirm baseline passes**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/AuthTest.php`
Expected: PASS (all tests green before touching anything)

- [ ] **Step 2: Create `AuthService`**

```php
<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial tidak valid.'],
            ]);
        }

        $token = $user->createToken('api-token', expiresAt: now()->addHours(24))->plainTextToken;

        ActivityLog::record('login', "Login: {$user->name}", $user, actorId: $user->id);

        return [
            'user' => $user,
            'token' => $token,
            'permissions' => $user->getAllPermissions(),
        ];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();

        ActivityLog::record('logout', "Logout: {$user->name}", $user);
    }

    public function refresh(User $user): string
    {
        $user->currentAccessToken()->delete();

        return $user->createToken('api-token', expiresAt: now()->addHours(24))->plainTextToken;
    }

    public function me(User $user): array
    {
        return [
            'user' => $user->load('roles.permissions'),
            'permissions' => $user->getAllPermissions(),
        ];
    }
}
```

- [ ] **Step 3: Thin `AuthController`**

Replace the full file with:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $result = $this->authService->login($request->email, $request->password);

        return response()->json(['data' => $result]);
    }

    public function logout(Request $request)
    {
        $this->authService->logout($request->user());

        return response()->json(['data' => null, 'message' => 'Logged out']);
    }

    public function refresh(Request $request)
    {
        $token = $this->authService->refresh($request->user());

        return response()->json(['data' => ['token' => $token]]);
    }

    public function me(Request $request)
    {
        return response()->json(['data' => $this->authService->me($request->user())]);
    }
}
```

- [ ] **Step 4: Confirm still green**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/AuthTest.php`
Expected: PASS, identical test count to Step 1

- [ ] **Step 5: Format and static-analyse**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && phpstan analyse`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/Services/AuthService.php src/backend/app/Http/Controllers/Api/AuthController.php
git commit -m "refactor: extract AuthController logic into AuthService"
```

---

## Task 2: `ActivityLogService` + thin `ActivityLogController`

**Files:**
- Create: `src/backend/app/Services/ActivityLogService.php`
- Modify: `src/backend/app/Http/Controllers/Api/ActivityLogController.php`
- Test: `src/backend/tests/Feature/Api/ActivityLogTest.php` (regression check)

**Interfaces:**
- Consumes: `Controller::paginated()`, `Controller::applySorting()` (from base Controller, unchanged)
- Produces: `ActivityLogService::filter(Request $request): Builder` (query builder, not yet paginated — controller still calls `paginate()`/`$this->paginated()` since that's base-Controller/HTTP concern), `ActivityLogService::track(string $path, ?string $title): void`

- [ ] **Step 1: Confirm baseline passes**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/ActivityLogTest.php`
Expected: PASS

- [ ] **Step 2: Create `ActivityLogService`**

```php
<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ActivityLogService
{
    public function filter(Request $request): Builder
    {
        $query = ActivityLog::query()->with('user:id,name,email');

        if ($request->filled('action')) {
            is_array($request->action)
                ? $query->whereIn('action', $request->action)
                : $query->where('action', $request->action);
        }

        if ($request->filled('subject_type')) {
            is_array($request->subject_type)
                ? $query->whereIn('subject_type', $request->subject_type)
                : $query->where('subject_type', $request->subject_type);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->search) {
            $query->where('description', 'like', "%{$request->search}%");
        }

        return $query;
    }

    public function track(string $path, ?string $title): void
    {
        $label = $title ?? $path;

        ActivityLog::record('navigate', "Membuka halaman: {$label}", null, [], url: $path);
    }
}
```

- [ ] **Step 3: Thin `ActivityLogController`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function __construct(private ActivityLogService $activityLogService) {}

    public function index(Request $request)
    {
        $query = $this->activityLogService->filter($request);

        $this->applySorting($query, $request, ['created_at', 'action'], 'created_at', 'desc');

        return $this->paginated($query->paginate($request->per_page ?? 15), ActivityLogResource::class);
    }

    /**
     * Record a client-side navigation event (page view) reported by the SPA.
     */
    public function track(Request $request)
    {
        $validated = $request->validate([
            'path' => 'required|string|max:255',
            'title' => 'nullable|string|max:255',
        ]);

        $this->activityLogService->track($validated['path'], $validated['title'] ?? null);

        return response()->json(['data' => null]);
    }
}
```

- [ ] **Step 4: Confirm still green**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/ActivityLogTest.php`
Expected: PASS, identical test count to Step 1

- [ ] **Step 5: Format and static-analyse**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && phpstan analyse`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/Services/ActivityLogService.php src/backend/app/Http/Controllers/Api/ActivityLogController.php
git commit -m "refactor: extract ActivityLogController logic into ActivityLogService"
```

---

## Task 3: `DueTypeService` + thin `DueTypeController`

**Files:**
- Create: `src/backend/app/Services/DueTypeService.php`
- Modify: `src/backend/app/Http/Controllers/Api/DueTypeController.php`
- Test: `src/backend/tests/Feature/Api/DueTypeTest.php` (regression check)

**Interfaces:**
- Produces: `DueTypeService::create(array $data): DueType`, `DueTypeService::update(DueType $dueType, array $data): DueType`, `DueTypeService::delete(DueType $dueType): void`

- [ ] **Step 1: Confirm baseline passes**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/DueTypeTest.php`
Expected: PASS

- [ ] **Step 2: Create `DueTypeService`**

```php
<?php

namespace App\Services;

use App\Models\DueType;

class DueTypeService
{
    public function create(array $data): DueType
    {
        return DueType::create($data);
    }

    public function update(DueType $dueType, array $data): DueType
    {
        $dueType->update($data);

        return $dueType;
    }

    public function delete(DueType $dueType): void
    {
        $dueType->delete();
    }
}
```

- [ ] **Step 3: Thin `DueTypeController`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DueTypeResource;
use App\Models\DueType;
use App\Services\DueTypeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DueTypeController extends Controller
{
    public function __construct(private DueTypeService $dueTypeService) {}

    public function index(Request $request)
    {
        $query = DueType::query();

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['name', 'amount', 'billing_cycle', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), DueTypeResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        return $this->bulkDelete($request, DueType::class);
    }

    public function bulkRestore(Request $request, string $modelClass = DueType::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request)
    {
        return $this->bulkForceDelete($request, DueType::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'amount' => 'required|numeric|min:0',
            'billing_cycle' => 'sometimes|in:bulanan,fleksibel',
        ]);

        $dueType = $this->dueTypeService->create($validated);

        return new DueTypeResource($dueType);
    }

    public function show(DueType $dueType)
    {
        return new DueTypeResource($dueType);
    }

    public function update(Request $request, DueType $dueType)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:50',
            'amount' => 'sometimes|numeric|min:0',
            'billing_cycle' => 'sometimes|in:bulanan,fleksibel',
        ]);

        $dueType = $this->dueTypeService->update($dueType, $validated);

        return new DueTypeResource($dueType);
    }

    public function destroy(DueType $dueType)
    {
        $this->dueTypeService->delete($dueType);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(DueType $dueType)
    {
        $this->restoreModel($dueType);

        return new DueTypeResource($dueType);
    }

    public function forceDestroy(DueType $dueType)
    {
        $this->forceDeleteModel($dueType);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
```

- [ ] **Step 4: Confirm still green**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/DueTypeTest.php`
Expected: PASS, identical test count to Step 1

- [ ] **Step 5: Format and static-analyse**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && phpstan analyse`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/Services/DueTypeService.php src/backend/app/Http/Controllers/Api/DueTypeController.php
git commit -m "refactor: extract DueTypeController logic into DueTypeService"
```

---

## Task 4: `ExpenseCategoryService` + thin `ExpenseCategoryController`

**Files:**
- Create: `src/backend/app/Services/ExpenseCategoryService.php`
- Modify: `src/backend/app/Http/Controllers/Api/ExpenseCategoryController.php`
- Test: `src/backend/tests/Feature/Api/ExpenseCategoryTest.php` (regression check)

**Interfaces:**
- Produces: `ExpenseCategoryService::create(array $data): ExpenseCategory`, `ExpenseCategoryService::update(ExpenseCategory $expenseCategory, array $data): ExpenseCategory`, `ExpenseCategoryService::delete(ExpenseCategory $expenseCategory): void`

- [ ] **Step 1: Confirm baseline passes**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/ExpenseCategoryTest.php`
Expected: PASS

- [ ] **Step 2: Create `ExpenseCategoryService`**

```php
<?php

namespace App\Services;

use App\Models\ExpenseCategory;

class ExpenseCategoryService
{
    public function create(array $data): ExpenseCategory
    {
        return ExpenseCategory::create($data);
    }

    public function update(ExpenseCategory $expenseCategory, array $data): ExpenseCategory
    {
        $expenseCategory->update($data);

        return $expenseCategory;
    }

    public function delete(ExpenseCategory $expenseCategory): void
    {
        $expenseCategory->delete();
    }
}
```

- [ ] **Step 3: Thin `ExpenseCategoryController`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseCategoryResource;
use App\Models\ExpenseCategory;
use App\Services\ExpenseCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseCategoryController extends Controller
{
    public function __construct(private ExpenseCategoryService $expenseCategoryService) {}

    public function index(Request $request)
    {
        $query = ExpenseCategory::query();
        $this->applyTrashedFilter($query, $request);

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['name', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), ExpenseCategoryResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        return $this->bulkDelete($request, ExpenseCategory::class);
    }

    public function bulkRestore(Request $request, string $modelClass = ExpenseCategory::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request): JsonResponse
    {
        return $this->bulkForceDelete($request, ExpenseCategory::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('expense_categories', 'name')],
        ]);

        $expenseCategory = $this->expenseCategoryService->create($validated);

        return new ExpenseCategoryResource($expenseCategory);
    }

    public function show(ExpenseCategory $expenseCategory)
    {
        return new ExpenseCategoryResource($expenseCategory);
    }

    public function update(Request $request, ExpenseCategory $expenseCategory)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100', Rule::unique('expense_categories', 'name')->ignore($expenseCategory->id)],
        ]);

        $expenseCategory = $this->expenseCategoryService->update($expenseCategory, $validated);

        return new ExpenseCategoryResource($expenseCategory);
    }

    public function destroy(ExpenseCategory $expenseCategory)
    {
        $this->expenseCategoryService->delete($expenseCategory);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(ExpenseCategory $expenseCategory)
    {
        $this->restoreModel($expenseCategory);

        return new ExpenseCategoryResource($expenseCategory);
    }

    public function forceDestroy(ExpenseCategory $expenseCategory)
    {
        $this->forceDeleteModel($expenseCategory);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
```

- [ ] **Step 4: Confirm still green**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/ExpenseCategoryTest.php`
Expected: PASS, identical test count to Step 1

- [ ] **Step 5: Format and static-analyse**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && phpstan analyse`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/Services/ExpenseCategoryService.php src/backend/app/Http/Controllers/Api/ExpenseCategoryController.php
git commit -m "refactor: extract ExpenseCategoryController logic into ExpenseCategoryService"
```

---

## Task 5: `ExpenseService` + thin `ExpenseController`

**Files:**
- Create: `src/backend/app/Services/ExpenseService.php`
- Modify: `src/backend/app/Http/Controllers/Api/ExpenseController.php`
- Test: `src/backend/tests/Feature/Api/ExpenseTest.php` (regression check)

**Interfaces:**
- Produces: `ExpenseService::create(array $data, int $createdBy): Expense`, `ExpenseService::update(Expense $expense, array $data): Expense`, `ExpenseService::delete(Expense $expense): void`

- [ ] **Step 1: Confirm baseline passes**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/ExpenseTest.php`
Expected: PASS

- [ ] **Step 2: Create `ExpenseService`**

```php
<?php

namespace App\Services;

use App\Models\Expense;

class ExpenseService
{
    public function create(array $data, int $createdBy): Expense
    {
        $data['created_by'] = $createdBy;

        return Expense::create($data)->load('category');
    }

    public function update(Expense $expense, array $data): Expense
    {
        $expense->update($data);

        return $expense->load('category');
    }

    public function delete(Expense $expense): void
    {
        $expense->delete();
    }
}
```

- [ ] **Step 3: Thin `ExpenseController`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use App\Services\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function __construct(private ExpenseService $expenseService) {}

    public function index(Request $request)
    {
        $query = Expense::query()->with('category');

        if ($request->month) {
            $query->whereMonth('expense_date', $request->month);
        }

        if ($request->year) {
            $query->whereYear('expense_date', $request->year);
        }

        if ($request->filled('category_id')) {
            is_array($request->category_id)
                ? $query->whereIn('category_id', $request->category_id)
                : $query->where('category_id', $request->category_id);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('description', 'like', "%{$request->search}%")
                    ->orWhereHas('category', function ($q) use ($request) {
                        $q->where('name', 'like', "%{$request->search}%");
                    });
            });
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['amount', 'expense_date', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), ExpenseResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        return $this->bulkDelete($request, Expense::class);
    }

    public function bulkRestore(Request $request, string $modelClass = Expense::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request)
    {
        return $this->bulkForceDelete($request, Expense::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:expense_categories,id',
            'description' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
        ]);

        $expense = $this->expenseService->create($validated, $request->user()->id);

        return new ExpenseResource($expense);
    }

    public function show(Expense $expense)
    {
        return new ExpenseResource($expense->load('category'));
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'category_id' => 'sometimes|exists:expense_categories,id',
            'description' => 'nullable|string|max:255',
            'amount' => 'sometimes|numeric|min:0',
            'expense_date' => 'sometimes|date',
        ]);

        $expense = $this->expenseService->update($expense, $validated);

        return new ExpenseResource($expense);
    }

    public function destroy(Expense $expense)
    {
        $this->expenseService->delete($expense);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(Expense $expense)
    {
        $this->restoreModel($expense);

        return new ExpenseResource($expense->load('category'));
    }

    public function forceDestroy(Expense $expense)
    {
        $this->forceDeleteModel($expense);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
```

- [ ] **Step 4: Confirm still green**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/ExpenseTest.php`
Expected: PASS, identical test count to Step 1

- [ ] **Step 5: Format and static-analyse**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && phpstan analyse`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/Services/ExpenseService.php src/backend/app/Http/Controllers/Api/ExpenseController.php
git commit -m "refactor: extract ExpenseController logic into ExpenseService"
```

---

## Task 6: `PermissionService` + thin `PermissionController`

**Files:**
- Create: `src/backend/app/Services/PermissionService.php`
- Modify: `src/backend/app/Http/Controllers/Api/PermissionController.php`
- Test: `src/backend/tests/Feature/Api/PermissionTest.php` (regression check)

**Interfaces:**
- Produces: `PermissionService::create(array $data): Permission`, `PermissionService::update(Permission $permission, array $data): Permission` (throws `ValidationException` if `$permission->isSystem()` and `$data` contains a `name` key), `PermissionService::delete(Permission $permission): void` (throws `ValidationException` if `$permission->isSystem()`)

- [ ] **Step 1: Confirm baseline passes**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/PermissionTest.php`
Expected: PASS

- [ ] **Step 2: Create `PermissionService`**

Note: the system-permission guard on `update` is currently expressed by branching *which validation rules* apply in the controller (system permissions can only have `description` changed, enforced by simply not including a `name` rule). That branching stays in the controller since it's about which fields are validatable, not a business rule to enforce after the fact — the Service only receives whatever survived validation and applies it.

```php
<?php

namespace App\Services;

use App\Models\Permission;
use Illuminate\Validation\ValidationException;

class PermissionService
{
    public function create(array $data): Permission
    {
        return Permission::create($data);
    }

    public function update(Permission $permission, array $data): Permission
    {
        $permission->update($data);

        return $permission;
    }

    public function delete(Permission $permission): void
    {
        if ($permission->isSystem()) {
            throw ValidationException::withMessages([
                'name' => ['Permission ini adalah permission inti sistem dan tidak bisa dihapus.'],
            ]);
        }

        $permission->delete();
    }
}
```

- [ ] **Step 3: Thin `PermissionController`**

`destroy()` now needs to translate the Service's `ValidationException` into the existing `422` JSON shape (the controller previously returned a plain `response()->json([...], 422)`, not a Laravel-validation-formatted response — so we catch it explicitly rather than letting Laravel's default exception handler reformat it):

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PermissionController extends Controller
{
    public function __construct(private PermissionService $permissionService) {}

    public function index(Request $request)
    {
        $query = Permission::query()->withCount('roles');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        $this->applySorting($query, $request, ['name'], 'name', 'asc');

        return $query->paginate($request->per_page ?? 10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'regex:/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/', 'unique:permissions,name'],
            'description' => 'nullable|string|max:255',
        ]);

        $permission = $this->permissionService->create($validated);

        return response()->json(['data' => $permission], 201);
    }

    public function show(Permission $permission)
    {
        return response()->json(['data' => $permission]);
    }

    public function update(Request $request, Permission $permission)
    {
        if ($permission->isSystem()) {
            $validated = $request->validate([
                'description' => 'nullable|string|max:255',
            ]);
        } else {
            $validated = $request->validate([
                'name' => [
                    'sometimes', 'string', 'max:100', 'regex:/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/',
                    Rule::unique('permissions', 'name')->ignore($permission->id),
                ],
                'description' => 'nullable|string|max:255',
            ]);
        }

        $permission = $this->permissionService->update($permission, $validated);

        return response()->json(['data' => $permission]);
    }

    public function destroy(Permission $permission)
    {
        try {
            $this->permissionService->delete($permission);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => 'Permission ini adalah permission inti sistem dan tidak bisa dihapus.',
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
```

- [ ] **Step 4: Confirm still green**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/PermissionTest.php`
Expected: PASS, identical test count to Step 1

- [ ] **Step 5: Format and static-analyse**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && phpstan analyse`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/Services/PermissionService.php src/backend/app/Http/Controllers/Api/PermissionController.php
git commit -m "refactor: extract PermissionController logic into PermissionService"
```

---

## Task 7: `ResidentService` + thin `ResidentController`

**Files:**
- Create: `src/backend/app/Services/ResidentService.php`
- Create: `src/backend/tests/Unit/ResidentServiceTest.php`
- Modify: `src/backend/app/Http/Controllers/Api/ResidentController.php`
- Test: `src/backend/tests/Feature/Api/ResidentTest.php` (regression check)

**Interfaces:**
- Produces: `ResidentService::create(array $data, ?UploadedFile $ktpPhoto): Resident`, `ResidentService::update(Resident $resident, array $data, ?UploadedFile $ktpPhoto): Resident`, `ResidentService::delete(Resident $resident): void` (throws `ValidationException` if resident has an active house), `ResidentService::deletableIds(array $ids): Collection<int>` (ids from `$ids` that have no active house)

- [ ] **Step 1: Write the failing unit test**

```php
<?php

namespace Tests\Unit;

use App\Models\House;
use App\Models\Resident;
use App\Services\ResidentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ResidentServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_cannot_delete_resident_with_active_house()
    {
        $resident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $this->expectException(ValidationException::class);

        (new ResidentService)->delete($resident);
    }

    public function test_can_delete_resident_without_active_house()
    {
        $resident = Resident::factory()->create();

        (new ResidentService)->delete($resident);

        $this->assertSoftDeleted($resident);
    }

    public function test_deletable_ids_excludes_residents_with_active_house()
    {
        $freeResident = Resident::factory()->create();
        $placedResident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $placedResident->id,
            'start_date' => '2026-01-01',
        ]);

        $deletableIds = (new ResidentService)->deletableIds([$freeResident->id, $placedResident->id]);

        $this->assertEquals([$freeResident->id], $deletableIds->all());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/backend && php artisan test --compact tests/Unit/ResidentServiceTest.php`
Expected: FAIL with "Class \"App\Services\ResidentService\" not found"

- [ ] **Step 3: Create `ResidentService`**

```php
<?php

namespace App\Services;

use App\Models\Resident;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ResidentService
{
    public function create(array $data, ?UploadedFile $ktpPhoto): Resident
    {
        if ($ktpPhoto !== null) {
            $data['ktp_photo_path'] = $ktpPhoto->store('ktp-photos', 'public');
        }

        return Resident::create($data);
    }

    public function update(Resident $resident, array $data, ?UploadedFile $ktpPhoto): Resident
    {
        if ($ktpPhoto !== null) {
            $data['ktp_photo_path'] = $ktpPhoto->store('ktp-photos', 'public');
        }

        $resident->update($data);

        return $resident;
    }

    public function delete(Resident $resident): void
    {
        if ($resident->activeHouse()->exists()) {
            throw ValidationException::withMessages([
                'resident' => ['Penghuni tidak bisa dihapus karena masih ditempatkan di sebuah rumah. Kosongkan rumah terlebih dahulu.'],
            ]);
        }

        $resident->delete();
    }

    /**
     * @param  array<int, int>  $ids
     * @return Collection<int, int>
     */
    public function deletableIds(array $ids): Collection
    {
        return Resident::whereIn('id', $ids)
            ->whereDoesntHave('activeHouse')
            ->pluck('id');
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/backend && php artisan test --compact tests/Unit/ResidentServiceTest.php`
Expected: PASS

- [ ] **Step 5: Confirm Feature baseline before thinning controller**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/ResidentTest.php`
Expected: PASS

- [ ] **Step 6: Thin `ResidentController`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ResidentResource;
use App\Models\Resident;
use App\Services\ResidentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResidentController extends Controller
{
    public function __construct(private ResidentService $residentService) {}

    public function index(Request $request)
    {
        $query = Resident::query();

        if ($request->filled('status')) {
            is_array($request->status)
                ? $query->whereIn('status', $request->status)
                : $query->where('status', $request->status);
        }

        if ($request->filled('marital_status')) {
            is_array($request->marital_status)
                ? $query->whereIn('marital_status', $request->marital_status)
                : $query->where('marital_status', $request->marital_status);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('full_name', 'like', "%{$request->search}%")
                    ->orWhere('phone_number', 'like', "%{$request->search}%");
            });
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['full_name', 'status', 'phone_number', 'marital_status', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), ResidentResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $deletableIds = $this->residentService->deletableIds($validated['ids']);
        $deleted = Resident::destroy($deletableIds);

        if ($deleted < count($validated['ids'])) {
            return response()->json([
                'data' => null,
                'message' => "{$deleted} penghuni berhasil dihapus. Sisanya tidak bisa dihapus karena masih ditempatkan di sebuah rumah.",
            ], 207);
        }

        return response()->json(['data' => null, 'message' => "{$deleted} penghuni berhasil dihapus"]);
    }

    public function bulkRestore(Request $request, string $modelClass = Resident::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request)
    {
        return $this->bulkForceDelete($request, Resident::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:150',
            'status' => 'required|in:kontrak,tetap',
            'phone_number' => 'required|string|max:20',
            'marital_status' => 'required|in:menikah,belum_menikah',
            'ktp_photo' => 'nullable|image|max:2048',
        ]);

        $resident = $this->residentService->create($validated, $request->file('ktp_photo'));

        return new ResidentResource($resident, 201);
    }

    public function show(Resident $resident)
    {
        return new ResidentResource($resident);
    }

    public function update(Request $request, Resident $resident)
    {
        $validated = $request->validate([
            'full_name' => 'sometimes|string|max:150',
            'status' => 'sometimes|in:kontrak,tetap',
            'phone_number' => 'sometimes|string|max:20',
            'marital_status' => 'sometimes|in:menikah,belum_menikah',
            'ktp_photo' => 'nullable|image|max:2048',
        ]);

        $resident = $this->residentService->update($resident, $validated, $request->file('ktp_photo'));

        return new ResidentResource($resident);
    }

    public function destroy(Resident $resident)
    {
        try {
            $this->residentService->delete($resident);
        } catch (\Illuminate\Validation\ValidationException $exception) {
            return response()->json([
                'message' => 'Penghuni tidak bisa dihapus karena masih ditempatkan di sebuah rumah. Kosongkan rumah terlebih dahulu.',
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(Resident $resident)
    {
        $this->restoreModel($resident);

        return new ResidentResource($resident);
    }

    public function forceDestroy(Resident $resident)
    {
        $this->forceDeleteModel($resident);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
```

- [ ] **Step 7: Confirm still green**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/ResidentTest.php tests/Unit/ResidentServiceTest.php`
Expected: PASS

- [ ] **Step 8: Format and static-analyse**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && phpstan analyse`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/backend/app/Services/ResidentService.php src/backend/app/Http/Controllers/Api/ResidentController.php src/backend/tests/Unit/ResidentServiceTest.php
git commit -m "refactor: extract ResidentController logic into ResidentService"
```

---

## Task 8: `HouseService` + thin `HouseController`

**Files:**
- Create: `src/backend/app/Services/HouseService.php`
- Create: `src/backend/tests/Unit/HouseServiceTest.php`
- Modify: `src/backend/app/Http/Controllers/Api/HouseController.php`
- Test: `src/backend/tests/Feature/Api/HouseTest.php` (regression check)

**Interfaces:**
- Produces: `HouseService::delete(House $house): void` (throws `ValidationException` if active resident or bill history exists), `HouseService::deletableIds(array $ids): Collection<int>`, `HouseService::assignResident(House $house, int $residentId, string $startDate, ?string $endDate): HouseResident`, `HouseService::vacateResident(House $house, ?string $endDate): void` (throws `ValidationException` if no active assignment)

- [ ] **Step 1: Write the failing unit test**

```php
<?php

namespace Tests\Unit;

use App\Models\Bill;
use App\Models\House;
use App\Models\Resident;
use App\Services\HouseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class HouseServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_cannot_delete_house_with_active_resident()
    {
        $house = House::factory()->create();
        $resident = Resident::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $resident->id,
            'start_date' => '2026-01-01',
        ]);

        $this->expectException(ValidationException::class);

        (new HouseService)->delete($house);
    }

    public function test_cannot_delete_house_with_bill_history()
    {
        $house = House::factory()->create();
        Bill::factory()->create(['house_id' => $house->id]);

        $this->expectException(ValidationException::class);

        (new HouseService)->delete($house);
    }

    public function test_can_delete_house_without_history()
    {
        $house = House::factory()->create();

        (new HouseService)->delete($house);

        $this->assertSoftDeleted($house);
    }

    public function test_assign_resident_closes_previous_assignment_and_marks_house_occupied()
    {
        $house = House::factory()->create(['status' => 'kosong']);
        $firstResident = Resident::factory()->create();
        $house->houseResidents()->create([
            'resident_id' => $firstResident->id,
            'start_date' => '2026-01-01',
        ]);

        $secondResident = Resident::factory()->create();
        (new HouseService)->assignResident($house, $secondResident->id, '2026-02-01', null);

        $this->assertEquals('2026-02-01', $house->houseResidents()->where('resident_id', $firstResident->id)->first()->end_date->toDateString());
        $this->assertDatabaseHas('house_residents', [
            'house_id' => $house->id,
            'resident_id' => $secondResident->id,
            'end_date' => null,
        ]);
        $this->assertEquals('dihuni', $house->fresh()->status);
    }

    public function test_vacate_resident_without_active_assignment_throws()
    {
        $house = House::factory()->create();

        $this->expectException(ValidationException::class);

        (new HouseService)->vacateResident($house, null);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/backend && php artisan test --compact tests/Unit/HouseServiceTest.php`
Expected: FAIL with "Class \"App\Services\HouseService\" not found"

- [ ] **Step 3: Create `HouseService`**

```php
<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\House;
use App\Models\HouseResident;
use App\Models\Resident;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class HouseService
{
    public function delete(House $house): void
    {
        if ($house->houseResidents()->whereNull('end_date')->exists()) {
            throw ValidationException::withMessages([
                'house' => ['Rumah tidak bisa dihapus karena masih memiliki penghuni aktif.'],
            ]);
        }

        if ($house->bills()->exists()) {
            throw ValidationException::withMessages([
                'house' => ['Rumah tidak bisa dihapus karena memiliki histori transaksi.'],
            ]);
        }

        $house->delete();
    }

    /**
     * @param  array<int, int>  $ids
     * @return Collection<int, int>
     */
    public function deletableIds(array $ids): Collection
    {
        return House::whereIn('id', $ids)
            ->whereDoesntHave('bills')
            ->whereDoesntHave('houseResidents', function ($query) {
                $query->whereNull('end_date');
            })
            ->pluck('id');
    }

    public function assignResident(House $house, int $residentId, string $startDate, ?string $endDate): HouseResident
    {
        $house->houseResidents()->whereNull('end_date')->update(['end_date' => $startDate]);

        $houseResident = $house->houseResidents()->create([
            'resident_id' => $residentId,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ]);

        $house->update(['status' => 'dihuni']);

        $resident = Resident::find($residentId);
        ActivityLog::record(
            'assigned',
            "Menempatkan penghuni {$resident?->full_name} ke rumah {$house->house_number}",
            $house
        );

        return $houseResident;
    }

    public function vacateResident(House $house, ?string $endDate): void
    {
        $activeAssignment = $house->houseResidents()->whereNull('end_date')->first();

        if (! $activeAssignment) {
            throw ValidationException::withMessages([
                'house' => ['Rumah ini tidak memiliki penghuni aktif.'],
            ]);
        }

        $activeAssignment->update(['end_date' => $endDate ?? now()->toDateString()]);

        $house->update(['status' => 'kosong']);

        $resident = $activeAssignment->resident;
        ActivityLog::record(
            'vacated',
            "Mencopot penghuni {$resident?->full_name} dari rumah {$house->house_number}",
            $house
        );
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/backend && php artisan test --compact tests/Unit/HouseServiceTest.php`
Expected: PASS

- [ ] **Step 5: Confirm Feature baseline before thinning controller**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/HouseTest.php`
Expected: PASS

- [ ] **Step 6: Thin `HouseController`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\HouseResource;
use App\Models\House;
use App\Services\HouseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class HouseController extends Controller
{
    public function __construct(private HouseService $houseService) {}

    public function index(Request $request)
    {
        $query = House::query()->with('currentResident');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('house_number', 'like', "%{$request->search}%")
                    ->orWhere('address', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('status')) {
            is_array($request->status)
                ? $query->whereIn('status', $request->status)
                : $query->where('status', $request->status);
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['house_number', 'address', 'status', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), HouseResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $deletableIds = $this->houseService->deletableIds($validated['ids']);
        $deleted = House::destroy($deletableIds);

        if ($deleted < count($validated['ids'])) {
            return response()->json([
                'data' => null,
                'message' => "{$deleted} rumah berhasil dihapus. Sisanya tidak bisa dihapus karena masih berpenghuni aktif atau memiliki histori transaksi.",
            ], 207);
        }

        return response()->json(['data' => null, 'message' => "{$deleted} rumah berhasil dihapus"]);
    }

    public function bulkRestore(Request $request, string $modelClass = House::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request)
    {
        return $this->bulkForceDelete($request, House::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'house_number' => 'required|string|max:20|unique:houses,house_number',
            'address' => 'nullable|string|max:255',
            'status' => 'sometimes|in:dihuni,kosong',
        ]);

        $house = House::create($validated);

        return new HouseResource($house, 201);
    }

    public function show(House $house)
    {
        $house->load('currentResident');

        return new HouseResource($house);
    }

    public function update(Request $request, House $house)
    {
        $validated = $request->validate([
            'house_number' => 'sometimes|string|max:20|unique:houses,house_number,'.$house->id,
            'address' => 'nullable|string|max:255',
            'status' => 'sometimes|in:dihuni,kosong',
        ]);

        $house->update($validated);

        return new HouseResource($house);
    }

    public function destroy(House $house)
    {
        try {
            $this->houseService->delete($house);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['house'][0],
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(House $house)
    {
        $this->restoreModel($house);
        $house->load('currentResident');

        return new HouseResource($house);
    }

    public function forceDestroy(House $house)
    {
        $this->forceDeleteModel($house);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }

    public function history(House $house)
    {
        $history = $house->houseResidents()
            ->with('resident')
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json(['data' => $history]);
    }

    public function assignResident(Request $request, House $house)
    {
        $validated = $request->validate([
            'resident_id' => 'required|exists:residents,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
        ]);

        $houseResident = $this->houseService->assignResident(
            $house,
            $validated['resident_id'],
            $validated['start_date'],
            $validated['end_date'] ?? null
        );

        return response()->json(['data' => $houseResident], 201);
    }

    public function vacateResident(Request $request, House $house)
    {
        $validated = $request->validate([
            'end_date' => 'nullable|date',
        ]);

        try {
            $this->houseService->vacateResident($house, $validated['end_date'] ?? null);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['house'][0],
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Penghuni berhasil dicopot dari rumah']);
    }
}
```

Note: `House::create()`/`update()` in `store`/`update` are intentionally left inline — they carry no business rule beyond the Eloquent call, matching the "thin CRUD stays visible" pattern used for `DueTypeService` etc. Only wire in the Service for `delete`, `deletableIds`, `assignResident`, `vacateResident`, which is where the actual rules live. If full uniformity is preferred instead (every write goes through the Service even when trivial), that's a one-line follow-up — flag it in review rather than blocking on it now.

- [ ] **Step 7: Confirm still green**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/HouseTest.php tests/Unit/HouseServiceTest.php`
Expected: PASS

- [ ] **Step 8: Format and static-analyse**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && phpstan analyse`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/backend/app/Services/HouseService.php src/backend/app/Http/Controllers/Api/HouseController.php src/backend/tests/Unit/HouseServiceTest.php
git commit -m "refactor: extract HouseController logic into HouseService"
```

---

## Task 9: `RoleService` + thin `RoleController`

**Files:**
- Create: `src/backend/app/Services/RoleService.php`
- Create: `src/backend/tests/Unit/RoleServiceTest.php`
- Modify: `src/backend/app/Http/Controllers/Api/RoleController.php`
- Test: `src/backend/tests/Feature/Api/RoleTest.php` (regression check)

**Interfaces:**
- Produces: `RoleService::create(array $data): Role`, `RoleService::update(Role $role, array $data): Role` (throws `ValidationException` if renaming the admin role away from `Role::ADMIN_ROLE_NAME`), `RoleService::delete(Role $role): void` (throws `ValidationException` if admin role or still in use)

- [ ] **Step 1: Write the failing unit test**

```php
<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\User;
use App\Services\RoleService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class RoleServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    public function test_cannot_rename_admin_role()
    {
        $admin = Role::where('name', Role::ADMIN_ROLE_NAME)->first();

        $this->expectException(ValidationException::class);

        (new RoleService)->update($admin, ['name' => 'super-admin']);
    }

    public function test_cannot_delete_admin_role()
    {
        $admin = Role::where('name', Role::ADMIN_ROLE_NAME)->first();

        $this->expectException(ValidationException::class);

        (new RoleService)->delete($admin);
    }

    public function test_cannot_delete_role_still_in_use()
    {
        $bendahara = Role::where('name', 'bendahara')->first();
        $user = User::factory()->create();
        $user->roles()->attach($bendahara->id);

        $this->expectException(ValidationException::class);

        (new RoleService)->delete($bendahara);
    }

    public function test_can_delete_unused_non_admin_role()
    {
        $warga = Role::where('name', 'warga')->first();

        (new RoleService)->delete($warga);

        $this->assertDatabaseMissing('roles', ['id' => $warga->id]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/backend && php artisan test --compact tests/Unit/RoleServiceTest.php`
Expected: FAIL with "Class \"App\Services\RoleService\" not found"

- [ ] **Step 3: Create `RoleService`**

```php
<?php

namespace App\Services;

use App\Models\Role;
use Illuminate\Validation\ValidationException;

class RoleService
{
    public function create(array $data): Role
    {
        $role = Role::create($data);
        $role->permissions()->sync($data['permission_ids'] ?? []);

        return $role->load('permissions')->loadCount('users');
    }

    public function update(Role $role, array $data): Role
    {
        if ($role->isAdmin() && array_key_exists('name', $data) && $data['name'] !== Role::ADMIN_ROLE_NAME) {
            throw ValidationException::withMessages([
                'name' => ['Role admin tidak bisa diganti namanya karena merupakan role khusus sistem.'],
            ]);
        }

        $role->update($data);

        if (array_key_exists('permission_ids', $data)) {
            $role->permissions()->sync($data['permission_ids']);
        }

        return $role->load('permissions')->loadCount('users');
    }

    public function delete(Role $role): void
    {
        if ($role->isAdmin()) {
            throw ValidationException::withMessages([
                'role' => ['Role admin tidak bisa dihapus karena merupakan role khusus sistem.'],
            ]);
        }

        if ($role->users()->exists()) {
            throw ValidationException::withMessages([
                'role' => ['Role tidak bisa dihapus karena masih digunakan oleh pengguna.'],
            ]);
        }

        $role->delete();
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/backend && php artisan test --compact tests/Unit/RoleServiceTest.php`
Expected: PASS

- [ ] **Step 5: Confirm Feature baseline before thinning controller**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/RoleTest.php`
Expected: PASS

- [ ] **Step 6: Thin `RoleController`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Services\RoleService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class RoleController extends Controller
{
    public function __construct(private RoleService $roleService) {}

    public function index(Request $request)
    {
        $query = Role::with('permissions')->withCount('users');

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['name', 'created_at']);

        return $query->paginate($request->per_page ?? 10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:roles,name',
            'description' => 'nullable|string|max:255',
            'permission_ids' => 'sometimes|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        $role = $this->roleService->create($validated);

        return response()->json(['data' => $role], 201);
    }

    public function show(Role $role)
    {
        return response()->json(['data' => $role->load('permissions')->loadCount('users')]);
    }

    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:50|unique:roles,name,'.$role->id,
            'description' => 'nullable|string|max:255',
            'permission_ids' => 'sometimes|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        try {
            $role = $this->roleService->update($role, $validated);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['name'][0],
            ], 422);
        }

        return response()->json(['data' => $role]);
    }

    public function destroy(Role $role)
    {
        try {
            $this->roleService->delete($role);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['role'][0],
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
```

- [ ] **Step 7: Confirm still green**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/RoleTest.php tests/Unit/RoleServiceTest.php`
Expected: PASS

- [ ] **Step 8: Format and static-analyse**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && phpstan analyse`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/backend/app/Services/RoleService.php src/backend/app/Http/Controllers/Api/RoleController.php src/backend/tests/Unit/RoleServiceTest.php
git commit -m "refactor: extract RoleController logic into RoleService"
```

---

## Task 10: `UserService` + thin `UserController`

**Files:**
- Create: `src/backend/app/Services/UserService.php`
- Create: `src/backend/tests/Unit/UserServiceTest.php`
- Modify: `src/backend/app/Http/Controllers/Api/UserController.php`
- Test: `src/backend/tests/Feature/Api/UserTest.php` (regression check)

**Interfaces:**
- Produces: `UserService::create(array $data): User` (throws `ValidationException` if `role_ids` includes admin and another admin already exists), `UserService::update(User $user, array $data): User` (throws `ValidationException` on admin-demotion or second-admin conflict), `UserService::delete(User $user): void` (throws `ValidationException` if user is admin), `UserService::bulkDeletable(array $ids): bool` (true if none of the ids is an admin user — mirrors current `anyUserHasAdminRole` but inverted for clarity at the call site), `UserService::forceDelete(User $user): void` (throws `ValidationException` if admin)

- [ ] **Step 1: Write the failing unit test**

```php
<?php

namespace Tests\Unit;

use App\Models\Role;
use App\Models\User;
use App\Services\UserService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class UserServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    public function test_cannot_create_second_admin()
    {
        $adminRoleId = Role::where('name', Role::ADMIN_ROLE_NAME)->value('id');
        $existingAdmin = User::factory()->create();
        $existingAdmin->roles()->attach($adminRoleId);

        $this->expectException(ValidationException::class);

        (new UserService)->create([
            'name' => 'Second Admin',
            'email' => 'second-admin@siwarga.test',
            'password' => 'password',
            'role_ids' => [$adminRoleId],
        ]);
    }

    public function test_cannot_demote_admin_user()
    {
        $adminRoleId = Role::where('name', Role::ADMIN_ROLE_NAME)->value('id');
        $wargaRoleId = Role::where('name', 'warga')->value('id');
        $admin = User::factory()->create();
        $admin->roles()->attach($adminRoleId);

        $this->expectException(ValidationException::class);

        (new UserService)->update($admin, ['role_ids' => [$wargaRoleId]]);
    }

    public function test_cannot_delete_admin_user()
    {
        $adminRoleId = Role::where('name', Role::ADMIN_ROLE_NAME)->value('id');
        $admin = User::factory()->create();
        $admin->roles()->attach($adminRoleId);

        $this->expectException(ValidationException::class);

        (new UserService)->delete($admin);
    }

    public function test_bulk_deletable_is_false_if_any_id_is_admin()
    {
        $adminRoleId = Role::where('name', Role::ADMIN_ROLE_NAME)->value('id');
        $admin = User::factory()->create();
        $admin->roles()->attach($adminRoleId);
        $regular = User::factory()->create();

        $this->assertFalse((new UserService)->bulkDeletable([$admin->id, $regular->id]));
        $this->assertTrue((new UserService)->bulkDeletable([$regular->id]));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/backend && php artisan test --compact tests/Unit/UserServiceTest.php`
Expected: FAIL with "Class \"App\Services\UserService\" not found"

- [ ] **Step 3: Create `UserService`**

```php
<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserService
{
    public function create(array $data): User
    {
        if (array_key_exists('role_ids', $data) && $this->assignsAdminRole($data['role_ids']) && $this->otherAdminExists()) {
            throw ValidationException::withMessages([
                'role_ids' => ['Sudah ada user dengan role admin. Hanya diperbolehkan satu admin untuk menghindari konflik kepentingan.'],
            ]);
        }

        $data['password'] = Hash::make($data['password']);
        $roleIds = $data['role_ids'] ?? null;
        unset($data['role_ids']);

        $user = User::create($data);

        if ($roleIds !== null) {
            $user->roles()->attach($roleIds);
        }

        return $user->load('roles');
    }

    public function update(User $user, array $data): User
    {
        if (array_key_exists('role_ids', $data)) {
            $userIsAdmin = $this->userHasAdminRole($user);
            $willBeAdmin = $this->assignsAdminRole($data['role_ids']);

            if ($userIsAdmin && ! $willBeAdmin) {
                throw ValidationException::withMessages([
                    'role_ids' => ['User dengan role admin tidak bisa dipindahkan ke role lain.'],
                ]);
            }

            if (! $userIsAdmin && $willBeAdmin && $this->otherAdminExists($user->id)) {
                throw ValidationException::withMessages([
                    'role_ids' => ['Sudah ada user dengan role admin. Hanya diperbolehkan satu admin untuk menghindari konflik kepentingan.'],
                ]);
            }
        }

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $roleIds = $data['role_ids'] ?? null;
        unset($data['role_ids']);

        $user->update($data);

        if ($roleIds !== null) {
            $user->roles()->sync($roleIds);
        }

        return $user->load('roles');
    }

    public function delete(User $user): void
    {
        if ($this->userHasAdminRole($user)) {
            throw ValidationException::withMessages([
                'user' => ['User dengan role admin tidak bisa dihapus.'],
            ]);
        }

        $user->delete();
    }

    public function forceDelete(User $user): void
    {
        if ($this->userHasAdminRole($user)) {
            throw ValidationException::withMessages([
                'user' => ['User dengan role admin tidak bisa dihapus.'],
            ]);
        }

        $user->forceDelete();
    }

    /**
     * @param  array<int, int>  $ids
     */
    public function bulkDeletable(array $ids): bool
    {
        return ! $this->anyUserHasAdminRole($ids);
    }

    /**
     * @param  array<int, int>  $roleIds
     */
    private function assignsAdminRole(array $roleIds): bool
    {
        $adminRoleId = Role::where('name', Role::ADMIN_ROLE_NAME)->value('id');

        return $adminRoleId && in_array($adminRoleId, $roleIds);
    }

    private function userHasAdminRole(User $user): bool
    {
        return $user->roles()->where('name', Role::ADMIN_ROLE_NAME)->exists();
    }

    /**
     * @param  array<int, int>  $userIds
     */
    private function anyUserHasAdminRole(array $userIds): bool
    {
        return User::whereIn('id', $userIds)
            ->whereHas('roles', function ($query) {
                $query->where('name', Role::ADMIN_ROLE_NAME);
            })
            ->exists();
    }

    private function otherAdminExists(?int $excludeUserId = null): bool
    {
        return User::whereHas('roles', function ($query) {
            $query->where('name', Role::ADMIN_ROLE_NAME);
        })
            ->when($excludeUserId, fn ($query) => $query->where('users.id', '!=', $excludeUserId))
            ->exists();
    }
}
```

Note: `forceDelete()` here calls `$user->forceDelete()` directly rather than going through the base Controller's `forceDeleteModel()` helper (which also enforces "must already be soft-deleted" and catches FK-violation exceptions). Since the controller still needs that generic behavior, `UserController::forceDestroy()` keeps calling `$this->forceDeleteModel($user)` for the mechanic and only asks `UserService` for the *admin guard* check beforehand — see Step 6.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/backend && php artisan test --compact tests/Unit/UserServiceTest.php`
Expected: PASS

- [ ] **Step 5: Confirm Feature baseline before thinning controller**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/UserTest.php`
Expected: PASS

- [ ] **Step 6: Thin `UserController`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function __construct(private UserService $userService) {}

    public function index(Request $request)
    {
        $query = User::with('roles');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['name', 'email', 'is_active', 'created_at']);

        return $query->paginate($request->per_page ?? 10);
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        if (! $this->userService->bulkDeletable($validated['ids'])) {
            return response()->json([
                'message' => 'User dengan role admin tidak bisa dihapus.',
            ], 422);
        }

        return $this->bulkDelete($request, User::class);
    }

    public function bulkRestore(Request $request, string $modelClass = User::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        if (! $this->userService->bulkDeletable($validated['ids'])) {
            return response()->json([
                'message' => 'User dengan role admin tidak bisa dihapus.',
            ], 422);
        }

        return $this->bulkForceDelete($request, User::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'resident_id' => 'sometimes|nullable|exists:residents,id|unique:users,resident_id',
            'role_ids' => 'sometimes|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        try {
            $user = $this->userService->create($validated);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['role_ids'][0],
            ], 422);
        }

        return response()->json(['data' => $user], 201);
    }

    public function show(User $user)
    {
        return response()->json(['data' => $user->load('roles')]);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:150',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'sometimes|string|min:8',
            'is_active' => 'sometimes|boolean',
            'resident_id' => 'sometimes|nullable|exists:residents,id|unique:users,resident_id,'.$user->id,
            'role_ids' => 'sometimes|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        try {
            $user = $this->userService->update($user, $validated);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['role_ids'][0],
            ], 422);
        }

        return response()->json(['data' => $user]);
    }

    public function destroy(User $user)
    {
        try {
            $this->userService->delete($user);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['user'][0],
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(User $user)
    {
        $this->restoreModel($user);

        return response()->json(['data' => $user->load('roles')]);
    }

    public function forceDestroy(User $user)
    {
        if ($this->userService->bulkDeletable([$user->id]) === false) {
            return response()->json([
                'message' => 'User dengan role admin tidak bisa dihapus.',
            ], 422);
        }

        $this->forceDeleteModel($user);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
```

- [ ] **Step 7: Confirm still green**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/UserTest.php tests/Unit/UserServiceTest.php`
Expected: PASS

- [ ] **Step 8: Format and static-analyse**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && phpstan analyse`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/backend/app/Services/UserService.php src/backend/app/Http/Controllers/Api/UserController.php src/backend/tests/Unit/UserServiceTest.php
git commit -m "refactor: extract UserController logic into UserService"
```

---

## Task 11: `BillService` + thin `BillController`

**Files:**
- Create: `src/backend/app/Services/BillService.php`
- Create: `src/backend/tests/Unit/BillServiceTest.php`
- Modify: `src/backend/app/Http/Controllers/Api/BillController.php`
- Test: `src/backend/tests/Feature/Api/BillTest.php` (regression check)

**Interfaces:**
- Consumes: `App\Services\BillGenerationService::generate(int $month, int $year, ?int $actorId): Collection` (existing, unchanged — `BillController::generate()` keeps using it)
- Produces: `BillService::delete(Bill $bill): void` (throws `ValidationException` if bill has payments), `BillService::deletableIds(array $ids): Collection<int>`

- [ ] **Step 1: Write the failing unit test**

```php
<?php

namespace Tests\Unit;

use App\Models\Bill;
use App\Models\Payment;
use App\Services\BillService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BillServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_cannot_delete_bill_with_payments()
    {
        $bill = Bill::factory()->create();
        Payment::factory()->create(['bill_id' => $bill->id]);

        $this->expectException(ValidationException::class);

        (new BillService)->delete($bill);
    }

    public function test_can_delete_bill_without_payments()
    {
        $bill = Bill::factory()->create();

        (new BillService)->delete($bill);

        $this->assertSoftDeleted($bill);
    }

    public function test_deletable_ids_excludes_bills_with_payments()
    {
        $freeBill = Bill::factory()->create();
        $paidBill = Bill::factory()->create();
        Payment::factory()->create(['bill_id' => $paidBill->id]);

        $deletableIds = (new BillService)->deletableIds([$freeBill->id, $paidBill->id]);

        $this->assertEquals([$freeBill->id], $deletableIds->all());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/backend && php artisan test --compact tests/Unit/BillServiceTest.php`
Expected: FAIL with "Class \"App\Services\BillService\" not found"

- [ ] **Step 3: Create `BillService`**

```php
<?php

namespace App\Services;

use App\Models\Bill;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class BillService
{
    public function delete(Bill $bill): void
    {
        if ($bill->payments()->exists()) {
            throw ValidationException::withMessages([
                'bill' => ['Tagihan tidak bisa dihapus karena sudah memiliki pembayaran.'],
            ]);
        }

        $bill->delete();
    }

    /**
     * @param  array<int, int>  $ids
     * @return Collection<int, int>
     */
    public function deletableIds(array $ids): Collection
    {
        return Bill::whereIn('id', $ids)
            ->whereDoesntHave('payments')
            ->pluck('id');
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/backend && php artisan test --compact tests/Unit/BillServiceTest.php`
Expected: PASS

- [ ] **Step 5: Confirm Feature baseline before thinning controller**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/BillTest.php`
Expected: PASS

- [ ] **Step 6: Thin `BillController`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BillResource;
use App\Models\Bill;
use App\Services\BillGenerationService;
use App\Services\BillService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BillController extends Controller
{
    public function __construct(
        private BillService $billService,
        private BillGenerationService $billGenerationService,
    ) {}

    public function index(Request $request)
    {
        $query = Bill::with(['house', 'resident', 'dueType']);

        if ($request->user()->resident_id) {
            $query->where('resident_id', $request->user()->resident_id);
        }

        if ($request->month) {
            $query->whereMonth('period_start', $request->month);
        }

        if ($request->year) {
            $query->whereYear('period_start', $request->year);
        }

        if ($request->filled('status')) {
            is_array($request->status)
                ? $query->whereIn('status', $request->status)
                : $query->where('status', $request->status);
        }

        if ($request->filled('due_type_id')) {
            is_array($request->due_type_id)
                ? $query->whereIn('due_type_id', $request->due_type_id)
                : $query->where('due_type_id', $request->due_type_id);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->whereHas('resident', function ($r) use ($request) {
                    $r->where('full_name', 'like', "%{$request->search}%");
                })->orWhereHas('house', function ($h) use ($request) {
                    $h->where('house_number', 'like', "%{$request->search}%");
                });
            });
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['period_start', 'period_end', 'amount_due', 'status', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), BillResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $deletableIds = $this->billService->deletableIds($validated['ids']);
        $deleted = Bill::destroy($deletableIds);

        if ($deleted < count($validated['ids'])) {
            return response()->json([
                'data' => null,
                'message' => "{$deleted} tagihan berhasil dihapus. Sisanya tidak bisa dihapus karena sudah memiliki pembayaran.",
            ], 207);
        }

        return response()->json(['data' => null, 'message' => "{$deleted} tagihan berhasil dihapus"]);
    }

    public function bulkRestore(Request $request, string $modelClass = Bill::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request)
    {
        return $this->bulkForceDelete($request, Bill::class);
    }

    public function show(Request $request, Bill $bill)
    {
        abort_if(
            $request->user()->resident_id && $bill->resident_id !== $request->user()->resident_id,
            403
        );

        $bill->load(['house', 'resident', 'dueType', 'payments']);

        return new BillResource($bill);
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020',
        ]);

        $bills = $this->billGenerationService->generate(
            $validated['month'],
            $validated['year'],
            $request->user()->id
        );

        return response()->json([
            'data' => BillResource::collection($bills),
            'message' => $bills->count().' bills generated',
        ], 201);
    }

    public function destroy(Bill $bill)
    {
        try {
            $this->billService->delete($bill);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['bill'][0],
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(Bill $bill)
    {
        $this->restoreModel($bill);
        $bill->load(['house', 'resident', 'dueType', 'payments']);

        return new BillResource($bill);
    }

    public function forceDestroy(Bill $bill)
    {
        $this->forceDeleteModel($bill);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
```

Check `BillGenerationService`'s constructor before wiring it in — confirm it has no required constructor arguments (it's currently instantiated with `new BillGenerationService` and no args in the existing code), so constructor injection is a drop-in replacement.

- [ ] **Step 7: Confirm still green**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/BillTest.php tests/Unit/BillServiceTest.php tests/Unit/BillGenerationServiceTest.php`
Expected: PASS

- [ ] **Step 8: Format and static-analyse**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && phpstan analyse`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/backend/app/Services/BillService.php src/backend/app/Http/Controllers/Api/BillController.php src/backend/tests/Unit/BillServiceTest.php
git commit -m "refactor: extract BillController logic into BillService"
```

---

## Task 12: `PaymentService` + thin `PaymentController`

**Files:**
- Create: `src/backend/app/Services/PaymentService.php`
- Create: `src/backend/tests/Unit/PaymentServiceTest.php`
- Modify: `src/backend/app/Http/Controllers/Api/PaymentController.php`
- Test: `src/backend/tests/Feature/Api/PaymentTest.php` (regression check)

**Interfaces:**
- Produces: `PaymentService::create(array $data, int $createdBy): Payment`, `PaymentService::update(Payment $payment, array $data): Payment`, `PaymentService::delete(Payment $payment): void`, `PaymentService::bulkDelete(array $ids): int` (returns count deleted), `PaymentService::restore(Payment $payment): void`, `PaymentService::refreshBillStatuses(array $billIds): void`

- [ ] **Step 1: Write the failing unit test**

```php
<?php

namespace Tests\Unit;

use App\Models\Bill;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_marks_bill_as_lunas_when_fully_paid()
    {
        $bill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'belum_lunas']);
        $user = \App\Models\User::factory()->create();

        (new PaymentService)->create([
            'bill_id' => $bill->id,
            'amount_paid' => 100000,
            'payment_date' => now()->toDateString(),
        ], $user->id);

        $this->assertEquals('lunas', $bill->fresh()->status);
    }

    public function test_create_keeps_bill_unpaid_when_partially_paid()
    {
        $bill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'belum_lunas']);
        $user = \App\Models\User::factory()->create();

        (new PaymentService)->create([
            'bill_id' => $bill->id,
            'amount_paid' => 40000,
            'payment_date' => now()->toDateString(),
        ], $user->id);

        $this->assertEquals('belum_lunas', $bill->fresh()->status);
    }

    public function test_delete_recalculates_bill_status_back_to_belum_lunas()
    {
        $bill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'lunas']);
        $payment = Payment::factory()->create(['bill_id' => $bill->id, 'amount_paid' => 100000]);

        (new PaymentService)->delete($payment);

        $this->assertEquals('belum_lunas', $bill->fresh()->status);
        $this->assertSoftDeleted($payment);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/backend && php artisan test --compact tests/Unit/PaymentServiceTest.php`
Expected: FAIL with "Class \"App\Services\PaymentService\" not found"

- [ ] **Step 3: Create `PaymentService`**

```php
<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function create(array $data, int $createdBy): Payment
    {
        $data['created_by'] = $createdBy;

        $payment = Payment::create($data);

        $this->refreshBillStatuses([$payment->bill_id]);

        return $payment->load(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);
    }

    public function update(Payment $payment, array $data): Payment
    {
        $oldBillId = $payment->bill_id;
        $payment->update($data);

        $this->refreshBillStatuses([$oldBillId, $payment->bill_id]);

        return $payment->load(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);
    }

    public function delete(Payment $payment): void
    {
        $billId = $payment->bill_id;

        DB::transaction(function () use ($payment, $billId) {
            $payment->delete();
            $this->refreshBillStatuses([$billId]);
        });
    }

    /**
     * @param  array<int, int>  $ids
     */
    public function bulkDelete(array $ids): int
    {
        $payments = Payment::whereIn('id', $ids)->get();
        $billIds = $payments->pluck('bill_id')->unique();

        return DB::transaction(function () use ($payments, $billIds) {
            $deleted = Payment::destroy($payments->pluck('id'));
            $this->refreshBillStatuses($billIds->all());

            return $deleted;
        });
    }

    public function afterBulkRestore(EloquentCollection $payments): void
    {
        $this->refreshBillStatuses($payments->pluck('bill_id')->all());
    }

    public function afterRestore(Payment $payment): void
    {
        $this->refreshBillStatuses([$payment->bill_id]);
    }

    /**
     * @param  array<int, int|null>  $billIds
     */
    public function refreshBillStatuses(array $billIds): void
    {
        $filteredBillIds = collect($billIds)
            ->filter()
            ->unique()
            ->values();

        if ($filteredBillIds->isEmpty()) {
            return;
        }

        Bill::whereIn('id', $filteredBillIds)->each(function (Bill $bill): void {
            $totalPaid = $bill->payments()->sum('amount_paid');

            $bill->update([
                'status' => $totalPaid >= $bill->amount_due ? 'lunas' : 'belum_lunas',
            ]);
        });
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/backend && php artisan test --compact tests/Unit/PaymentServiceTest.php`
Expected: PASS

- [ ] **Step 5: Confirm Feature baseline before thinning controller**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/PaymentTest.php`
Expected: PASS

- [ ] **Step 6: Thin `PaymentController`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private PaymentService $paymentService) {}

    public function index(Request $request)
    {
        $query = Payment::with(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);

        if ($request->user()->resident_id) {
            $query->whereHas('bill', function ($q) use ($request) {
                $q->where('resident_id', $request->user()->resident_id);
            });
        }

        if ($request->month) {
            $query->whereMonth('payment_date', $request->month);
        }

        if ($request->year) {
            $query->whereYear('payment_date', $request->year);
        }

        if ($request->bill_id) {
            $query->where('bill_id', $request->bill_id);
        }

        if ($request->search) {
            $query->whereHas('bill', function ($q) use ($request) {
                $q->whereHas('resident', function ($r) use ($request) {
                    $r->where('full_name', 'like', "%{$request->search}%");
                })->orWhereHas('house', function ($h) use ($request) {
                    $h->where('house_number', 'like', "%{$request->search}%");
                })->orWhereHas('dueType', function ($d) use ($request) {
                    $d->where('name', 'like', "%{$request->search}%");
                });
            });
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['amount_paid', 'payment_date', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), PaymentResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $deleted = $this->paymentService->bulkDelete($validated['ids']);

        return response()->json(['data' => null, 'message' => "{$deleted} pembayaran berhasil dihapus"]);
    }

    public function bulkRestore(Request $request, string $modelClass = Payment::class): JsonResponse
    {
        return $this->bulkRestoreWithCallback($request, $modelClass, function (EloquentCollection $payments): void {
            $this->paymentService->afterBulkRestore($payments);
        });
    }

    public function bulkForceDestroy(Request $request)
    {
        return $this->bulkForceDelete($request, Payment::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'bill_id' => 'required|exists:bills,id',
            'amount_paid' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string|max:255',
        ]);

        $payment = $this->paymentService->create($validated, $request->user()->id);

        return new PaymentResource($payment);
    }

    public function show(Request $request, Payment $payment)
    {
        $payment->load(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);

        abort_if(
            $request->user()->resident_id && $payment->bill?->resident_id !== $request->user()->resident_id,
            403
        );

        return new PaymentResource($payment);
    }

    public function update(Request $request, Payment $payment)
    {
        $validated = $request->validate([
            'bill_id' => 'sometimes|exists:bills,id',
            'amount_paid' => 'sometimes|numeric|min:0',
            'payment_date' => 'sometimes|date',
            'notes' => 'nullable|string|max:255',
        ]);

        $payment = $this->paymentService->update($payment, $validated);

        return new PaymentResource($payment);
    }

    public function destroy(Payment $payment)
    {
        $this->paymentService->delete($payment);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(Payment $payment)
    {
        $this->restoreModel($payment, function (Payment $restoredPayment): void {
            $this->paymentService->afterRestore($restoredPayment);
        });
        $payment->load(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);

        return new PaymentResource($payment);
    }

    public function forceDestroy(Payment $payment)
    {
        $this->forceDeleteModel($payment);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
```

- [ ] **Step 7: Confirm still green**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/PaymentTest.php tests/Unit/PaymentServiceTest.php`
Expected: PASS

- [ ] **Step 8: Format and static-analyse**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && phpstan analyse`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/backend/app/Services/PaymentService.php src/backend/app/Http/Controllers/Api/PaymentController.php src/backend/tests/Unit/PaymentServiceTest.php
git commit -m "refactor: extract PaymentController logic into PaymentService"
```

---

## Task 13: Full regression pass

**Files:** none created/modified — verification only.

- [ ] **Step 1: Run the full backend CI-equivalent check**

Run: `cd src/backend && composer test`
Expected: PASS (config:clear + pint --test + phpstan + phpunit, all green)

- [ ] **Step 2: Run the full test suite once more explicitly for a clean count**

Run: `cd src/backend && php artisan test --compact`
Expected: PASS, same total test count as before this plan started (no test was deleted or skipped)

- [ ] **Step 3: Spot-check RBAC still enforced end-to-end**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/RbacTest.php`
Expected: PASS — confirms the `can:*` middleware/Gate wiring around every refactored controller is untouched
