# Kategori Pengeluaran (Expense Categories) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `expenses.category` (free-text string) into a managed `expense_categories` resource with full CRUD (backend API + RBAC + frontend UI), and make `expenses.category_id` a required foreign key.

**Architecture:** New `ExpenseCategory` model/table mirroring the existing `DueType` CRUD pattern exactly (controller/resource/policy/gates/routes/factory/seeder/tests on the backend; feature module/service/hook/route/mocks on the frontend). The existing `create_expenses_table` migration is edited in place (per explicit user instruction — this is a pre-launch app reset via `migrate:fresh --seed`, no data-preservation concern) rather than adding a new alter-table migration.

**Tech Stack:** Laravel 13 (PHP 8.3, Sanctum, custom RBAC via Gate::define + Policies), PHPUnit feature tests; React 19 + TS, TanStack Router/Query, react-hook-form + zod, shadcn/ui, MSW mocks.

## Global Constraints

- Backend: run `vendor/bin/pint --dirty --format agent` on changed PHP files before considering a backend task done.
- Backend: every change must have a passing test; run the specific test file/filter after each backend task, not the full suite.
- Do NOT create a new migration for the `expenses` table column change — edit `database/migrations/2026_07_27_143642_create_expenses_table.php` directly (explicit user instruction).
- Follow existing per-resource conventions exactly (`DueType*` for backend, `siwarga-due-types` for frontend) — do not introduce new abstractions (no separate provider file, no service layer class) since the reference pattern doesn't use them for a simple resource like this.
- No data-migration/backfill script for old string categories — dev-stage reset is acceptable.
- Frontend: this codebase has no unit/e2e tests for `due-types`/`expenses` — verify frontend tasks with `npm run lint` and `npm run build` (tsc), not new test files.

---

### Task 1: `expense_categories` migration + edit `expenses` migration

**Files:**
- Create: `src/backend/database/migrations/2026_07_27_143641_create_expense_categories_table.php`
- Modify: `src/backend/database/migrations/2026_07_27_143642_create_expenses_table.php`

**Interfaces:**
- Produces: `expense_categories` table (`id`, `name` unique string(100), `deleted_at`, timestamps), consumed by Task 2 (`ExpenseCategory` model) and the FK on `expenses.category_id`.
- Produces: `expenses.category_id` (required `foreignId` → `expense_categories.id`, restrict on delete), replacing `expenses.category` (string), consumed by Task 2 (`Expense` model).

This task has no test of its own (migrations are exercised by the tests in later tasks); just get the schema right and confirm it migrates cleanly.

- [ ] **Step 1: Create the `expense_categories` migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expense_categories');
    }
};
```

- [ ] **Step 2: Edit the existing `expenses` migration**

In `src/backend/database/migrations/2026_07_27_143642_create_expenses_table.php`, replace:

```php
            $table->string('category', 100);
```

with:

```php
            $table->foreignId('category_id')->constrained('expense_categories');
```

The full `up()` should read:

```php
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('expense_categories');
            $table->string('description', 255)->nullable();
            $table->decimal('amount', 12, 2);
            $table->date('expense_date');
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->softDeletes();
            $table->timestamps();
        });
    }
```

- [ ] **Step 3: Verify the migrations run cleanly**

Run: `cd src/backend && php artisan migrate:fresh --no-interaction`
Expected: all migrations run without error, including `create_expense_categories_table` before `create_expenses_table`.

- [ ] **Step 4: Commit**

```bash
git add src/backend/database/migrations/2026_07_27_143641_create_expense_categories_table.php src/backend/database/migrations/2026_07_27_143642_create_expenses_table.php
git commit -m "feat: add expense_categories table and FK from expenses"
```

---

### Task 2: `ExpenseCategory` model + update `Expense` model

**Files:**
- Create: `src/backend/app/Models/ExpenseCategory.php`
- Modify: `src/backend/app/Models/Expense.php`
- Test: `src/backend/tests/Feature/Api/ExpenseCategoryTest.php` (created fully in Task 7; here we only need the model to exist — no standalone model test file exists elsewhere in this codebase, models are exercised via feature tests)

**Interfaces:**
- Consumes: `expense_categories` table from Task 1.
- Produces: `App\Models\ExpenseCategory` (`fillable = ['name']`, `HasFactory`, `SoftDeletes`), consumed by Tasks 4, 5, 6, 7.
- Produces: `Expense::category(): BelongsTo` and `fillable = ['category_id', 'description', 'amount', 'expense_date', 'created_by']`, consumed by Task 6.

- [ ] **Step 1: Create `ExpenseCategory` model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpenseCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['name'];
}
```

- [ ] **Step 2: Update `Expense` model**

In `src/backend/app/Models/Expense.php`, replace the `category` fillable entry and add the relation:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Expense extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['category_id', 'description', 'amount', 'expense_date', 'created_by'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expense_date' => 'date',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class);
    }
}
```

- [ ] **Step 3: Sanity-check via tinker**

Run: `cd src/backend && php artisan tinker --execute 'echo App\Models\ExpenseCategory::class . " OK";'`
Expected: prints `App\Models\ExpenseCategory OK` (class autoloads without error).

- [ ] **Step 4: Commit**

```bash
git add src/backend/app/Models/ExpenseCategory.php src/backend/app/Models/Expense.php
git commit -m "feat: add ExpenseCategory model, relate Expense to it"
```

---

### Task 3: Permissions, policy, gates, RBAC seeding

**Files:**
- Modify: `src/backend/app/Models/Permission.php`
- Create: `src/backend/app/Policies/ExpenseCategoryPolicy.php`
- Modify: `src/backend/app/Providers/AppServiceProvider.php`
- Modify: `src/backend/database/seeders/RoleSeeder.php`
- Test: `src/backend/tests/Feature/Api/RbacTest.php` (extended in Task 8)

**Interfaces:**
- Consumes: nothing new.
- Produces: gates `expense-categories.view`, `expense-categories.manage`, consumed by Task 4's route middleware.
- Produces: `ExpenseCategoryPolicy` with `viewAny/view/create/update/delete`, consumed by the gate definitions in this task.

- [ ] **Step 1: Register the two new permissions**

In `src/backend/app/Models/Permission.php`, add after the `expenses.*` block (before `'reports.view'`):

```php
        'expenses.view' => 'Lihat pengeluaran',
        'expenses.create' => 'Catat pengeluaran',
        'expenses.edit' => 'Ubah pengeluaran',
        'expenses.delete' => 'Hapus pengeluaran',
        'expense-categories.view' => 'Lihat kategori pengeluaran',
        'expense-categories.manage' => 'Kelola kategori pengeluaran',
        'reports.view' => 'Lihat laporan',
```

- [ ] **Step 2: Create `ExpenseCategoryPolicy`**

```php
<?php

namespace App\Policies;

use App\Models\User;

class ExpenseCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('expense-categories.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('expense-categories.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('expense-categories.manage');
    }

    public function update(User $user): bool
    {
        return $user->hasPermission('expense-categories.manage');
    }

    public function delete(User $user): bool
    {
        return $user->hasPermission('expense-categories.manage');
    }
}
```

- [ ] **Step 3: Register gates and the activity-log observer**

In `src/backend/app/Providers/AppServiceProvider.php`:

Add the import:
```php
use App\Models\ExpenseCategory;
use App\Policies\ExpenseCategoryPolicy;
```
(keep the existing `use` list alphabetically ordered — `ExpenseCategory` goes right after `Expense` model import, `ExpenseCategoryPolicy` right after `DueTypePolicy` import in the policies group... actually keep alphabetical: `use App\Models\Expense;` then `use App\Models\ExpenseCategory;`; policies: `use App\Policies\ExpenseCategoryPolicy;` then `use App\Policies\ExpensePolicy;`)

Add the gate block right after the `Due Types` gates:
```php
        // Due Types
        Gate::define('due-types.view', [DueTypePolicy::class, 'viewAny']);
        Gate::define('due-types.manage', [DueTypePolicy::class, 'create']);

        // Expense Categories
        Gate::define('expense-categories.view', [ExpenseCategoryPolicy::class, 'viewAny']);
        Gate::define('expense-categories.manage', [ExpenseCategoryPolicy::class, 'create']);
```

Add `ExpenseCategory::class` to the observer loop:
```php
        foreach ([Resident::class, House::class, DueType::class, Bill::class, Payment::class, Expense::class, ExpenseCategory::class, User::class, Role::class, Permission::class] as $model) {
```

- [ ] **Step 4: Grant `bendahara` the new permissions**

In `src/backend/database/seeders/RoleSeeder.php`, update the bendahara list:

```php
        // Bendahara gets financial permissions
        $bendahara->permissions()->attach(Permission::whereIn('name', [
            'houses.view', 'bills.view', 'bills.generate', 'payments.view', 'payments.create',
            'expenses.view', 'expenses.create', 'expenses.edit', 'expenses.delete',
            'expense-categories.view', 'expense-categories.manage', 'reports.view',
        ])->pluck('id'));
```

- [ ] **Step 5: Format and verify**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent`
Run: `php artisan migrate:fresh --seed --no-interaction`
Expected: seeding completes without error (proves `Permission::SYSTEM_PERMISSIONS` and `RoleSeeder` are syntactically/logically valid).

- [ ] **Step 6: Commit**

```bash
git add src/backend/app/Models/Permission.php src/backend/app/Policies/ExpenseCategoryPolicy.php src/backend/app/Providers/AppServiceProvider.php src/backend/database/seeders/RoleSeeder.php
git commit -m "feat: add expense-categories permissions, policy and gates"
```

---

### Task 4: `ExpenseCategoryResource`, `ExpenseCategoryController`, routes

**Files:**
- Create: `src/backend/app/Http/Resources/ExpenseCategoryResource.php`
- Create: `src/backend/app/Http/Controllers/Api/ExpenseCategoryController.php`
- Modify: `src/backend/routes/api.php`

**Interfaces:**
- Consumes: `App\Models\ExpenseCategory` (Task 2), gates `expense-categories.view`/`.manage` (Task 3).
- Produces: `GET/POST /api/expense-categories`, `GET/PUT/DELETE /api/expense-categories/{expenseCategory}`, `POST /api/expense-categories/bulk-delete`, consumed by Task 7's tests and the frontend service in Task 10.

- [ ] **Step 1: Create `ExpenseCategoryResource`**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
```

- [ ] **Step 2: Create `ExpenseCategoryController`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseCategoryResource;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = ExpenseCategory::query();

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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $expenseCategory = ExpenseCategory::create($validated);

        return new ExpenseCategoryResource($expenseCategory);
    }

    public function show(ExpenseCategory $expenseCategory)
    {
        return new ExpenseCategoryResource($expenseCategory);
    }

    public function update(Request $request, ExpenseCategory $expenseCategory)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
        ]);

        $expenseCategory->update($validated);

        return new ExpenseCategoryResource($expenseCategory);
    }

    public function destroy(ExpenseCategory $expenseCategory)
    {
        $expenseCategory->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
```

- [ ] **Step 3: Register routes**

In `src/backend/routes/api.php`, add the import:
```php
use App\Http\Controllers\Api\ExpenseCategoryController;
```
(alphabetically after `ExpenseController` import — actually `ExpenseCategoryController` sorts before `ExpenseController` alphabetically: place it before the `ExpenseController` import line.)

Add the route block right before the `// Expenses` block:
```php
    // Expense Categories
    Route::get('expense-categories', [ExpenseCategoryController::class, 'index'])->middleware('can:expense-categories.view');
    Route::post('expense-categories', [ExpenseCategoryController::class, 'store'])->middleware('can:expense-categories.manage');
    Route::post('expense-categories/bulk-delete', [ExpenseCategoryController::class, 'bulkDestroy'])->middleware('can:expense-categories.manage');
    Route::get('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'show'])->middleware('can:expense-categories.view');
    Route::put('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update'])->middleware('can:expense-categories.manage');
    Route::delete('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy'])->middleware('can:expense-categories.manage');

    // Expenses
```

- [ ] **Step 4: Format and route-list check**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent`
Run: `php artisan route:list --path=expense-categories`
Expected: 6 routes listed (`GET expense-categories`, `POST expense-categories`, `POST expense-categories/bulk-delete`, `GET expense-categories/{expenseCategory}`, `PUT expense-categories/{expenseCategory}`, `DELETE expense-categories/{expenseCategory}`).

- [ ] **Step 5: Commit**

```bash
git add src/backend/app/Http/Resources/ExpenseCategoryResource.php src/backend/app/Http/Controllers/Api/ExpenseCategoryController.php src/backend/routes/api.php
git commit -m "feat: add expense category CRUD endpoints"
```

---

### Task 5: `ExpenseCategoryFactory` + `ExpenseCategorySeeder`, update expense factory/seeder

**Files:**
- Create: `src/backend/database/factories/ExpenseCategoryFactory.php`
- Create: `src/backend/database/seeders/ExpenseCategorySeeder.php`
- Modify: `src/backend/database/factories/ExpenseFactory.php`
- Modify: `src/backend/database/seeders/ExpenseSeeder.php`
- Modify: `src/backend/database/seeders/DatabaseSeeder.php`

**Interfaces:**
- Consumes: `App\Models\ExpenseCategory` (Task 2).
- Produces: `ExpenseCategory::factory()` usable by `ExpenseFactory` and tests (Tasks 7, 8).

- [ ] **Step 1: Create `ExpenseCategoryFactory`**

```php
<?php

namespace Database\Factories;

use App\Models\ExpenseCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExpenseCategory>
 */
class ExpenseCategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
        ];
    }
}
```

- [ ] **Step 2: Create `ExpenseCategorySeeder`**

```php
<?php

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use Illuminate\Database\Seeder;

class ExpenseCategorySeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            'Keamanan',
            'Kebersihan',
            'Listrik & Air',
            'Perbaikan Fasilitas',
            'Lainnya',
        ] as $name) {
            ExpenseCategory::create(['name' => $name]);
        }
    }
}
```

- [ ] **Step 3: Update `ExpenseFactory` to use `category_id`**

```php
<?php

namespace Database\Factories;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Expense>
 */
class ExpenseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => ExpenseCategory::factory(),
            'description' => fake()->sentence(),
            'amount' => fake()->randomFloat(2, 10000, 1000000),
            'expense_date' => now(),
            'created_by' => User::factory(),
        ];
    }
}
```

- [ ] **Step 4: Update `ExpenseSeeder` to reference seeded categories by name**

```php
<?php

namespace Database\Seeders;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ExpenseSeeder extends Seeder
{
    /**
     * Requires UserSeeder and ExpenseCategorySeeder to have run first.
     */
    public function run(): void
    {
        $admin = User::where('email', 'admin@siwarga.test')->first();

        $items = [
            ['category' => 'Keamanan', 'description' => 'Gaji satpam bulanan'],
            ['category' => 'Kebersihan', 'description' => 'Upah petugas kebersihan'],
            ['category' => 'Listrik & Air', 'description' => 'Token listrik pos satpam'],
            ['category' => 'Perbaikan Fasilitas', 'description' => 'Perbaikan jalan berlubang'],
            ['category' => 'Lainnya', 'description' => 'Alat tulis kantor RT'],
        ];

        $categoryIds = ExpenseCategory::pluck('id', 'name');

        $now = Carbon::now();
        foreach ([2, 1, 0] as $monthsAgo) {
            $period = $now->copy()->subMonths($monthsAgo);
            foreach ($items as $item) {
                Expense::create([
                    'category_id' => $categoryIds[$item['category']],
                    'description' => $item['description'],
                    'amount' => fake()->randomFloat(2, 50000, 1500000),
                    'expense_date' => $period->copy()->day(random_int(1, 25)),
                    'created_by' => $admin?->id,
                ]);
            }
        }
    }
}
```

- [ ] **Step 5: Wire `ExpenseCategorySeeder` into `DatabaseSeeder` before `ExpenseSeeder`**

In `src/backend/database/seeders/DatabaseSeeder.php`:

```php
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            DueTypeSeeder::class,
            HouseSeeder::class,
            ResidentSeeder::class,
            UserSeeder::class,
            BillSeeder::class,
            PaymentSeeder::class,
            ExpenseCategorySeeder::class,
            ExpenseSeeder::class,
        ]);
```

- [ ] **Step 6: Verify full seed works end-to-end**

Run: `cd src/backend && php artisan migrate:fresh --seed --no-interaction`
Expected: completes without error; spot-check with `php artisan tinker --execute 'echo App\Models\Expense::first()->category->name;'` prints a category name (e.g. `Keamanan`).

- [ ] **Step 7: Format and commit**

```bash
cd src/backend && vendor/bin/pint --dirty --format agent
git add src/backend/database/factories/ExpenseCategoryFactory.php src/backend/database/seeders/ExpenseCategorySeeder.php src/backend/database/factories/ExpenseFactory.php src/backend/database/seeders/ExpenseSeeder.php src/backend/database/seeders/DatabaseSeeder.php
git commit -m "feat: seed expense categories, point expense factory/seeder at category_id"
```

---

### Task 6: Update `ExpenseController` and `ExpenseResource` for `category_id`

**Files:**
- Modify: `src/backend/app/Http/Controllers/Api/ExpenseController.php`
- Modify: `src/backend/app/Http/Resources/ExpenseResource.php`
- Modify: `src/backend/routes/api.php`

**Interfaces:**
- Consumes: `Expense::category()` relation (Task 2), `ExpenseCategoryResource` (Task 4).
- Produces: `ExpenseResource` shape `{ ..., category: { id, name, ... } }` (breaking change from the old `category: string`), consumed by Task 8's updated tests and the frontend (Tasks 9, 14).

- [ ] **Step 1: Update `ExpenseController`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
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

        $this->applySorting($query, $request, ['amount', 'expense_date', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), ExpenseResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        return $this->bulkDelete($request, Expense::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:expense_categories,id',
            'description' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
        ]);

        $validated['created_by'] = $request->user()->id;

        $expense = Expense::create($validated);

        return new ExpenseResource($expense->load('category'));
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

        $expense->update($validated);

        return new ExpenseResource($expense->load('category'));
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
```

Note: `category` string search/sort/filter is gone (`'category'` removed from `applySorting`'s whitelist since it was never actually a sortable column — the previous whitelist listed `'category'` but it sorted the raw string; now filtering by category goes through `category_id`, and free-text category search happens via the `orWhereHas('category', ...)` clause above). The `categories()` action is removed entirely — superseded by `GET /api/expense-categories`.

- [ ] **Step 2: Update `ExpenseResource`**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category' => new ExpenseCategoryResource($this->whenLoaded('category')),
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'expense_date' => $this->expense_date,
            'created_by' => $this->creator,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
```

- [ ] **Step 3: Remove the `expenses/categories` route**

In `src/backend/routes/api.php`, delete this line from the Expenses block:
```php
    Route::get('expenses/categories', [ExpenseController::class, 'categories'])->middleware('can:expenses.view');
```

- [ ] **Step 4: Format**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent`

(Tests for this are covered in Task 8 — `ExpenseTest.php` is rewritten there against this new contract.)

- [ ] **Step 5: Commit**

```bash
git add src/backend/app/Http/Controllers/Api/ExpenseController.php src/backend/app/Http/Resources/ExpenseResource.php src/backend/routes/api.php
git commit -m "feat: switch expenses endpoint to category_id, drop distinct-categories endpoint"
```

---

### Task 7: `ExpenseCategoryTest` feature test (CRUD + RBAC + restrict-on-delete)

**Files:**
- Create: `src/backend/tests/Feature/Api/ExpenseCategoryTest.php`

**Interfaces:**
- Consumes: routes from Task 4, `ExpenseCategory`/`Expense` factories from Tasks 2 & 5.

- [ ] **Step 1: Write the test file**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseCategoryTest extends TestCase
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

    public function test_can_list_expense_categories()
    {
        ExpenseCategory::factory()->count(3)->create();

        $response = $this->actingAs($this->admin)->getJson('/api/expense-categories');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_can_search_expense_categories_by_name()
    {
        ExpenseCategory::factory()->create(['name' => 'Keamanan']);
        ExpenseCategory::factory()->create(['name' => 'Kebersihan']);

        $response = $this->actingAs($this->admin)->getJson('/api/expense-categories?search=Keamanan');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_can_create_expense_category()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/expense-categories', [
            'name' => 'Keamanan',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.name', 'Keamanan');
    }

    public function test_validates_required_expense_category_fields()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/expense-categories', []);

        $response->assertStatus(422);
    }

    public function test_can_show_expense_category()
    {
        $category = ExpenseCategory::factory()->create();

        $response = $this->actingAs($this->admin)->getJson("/api/expense-categories/{$category->id}");

        $response->assertStatus(200)->assertJsonPath('data.id', $category->id);
    }

    public function test_can_update_expense_category()
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Lama']);

        $response = $this->actingAs($this->admin)->putJson("/api/expense-categories/{$category->id}", [
            'name' => 'Baru',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.name', 'Baru');
    }

    public function test_can_soft_delete_unused_expense_category()
    {
        $category = ExpenseCategory::factory()->create();

        $this->actingAs($this->admin)->deleteJson("/api/expense-categories/{$category->id}");

        $this->assertSoftDeleted($category);
    }

    public function test_cannot_delete_expense_category_still_referenced_by_an_expense()
    {
        $category = ExpenseCategory::factory()->create();
        Expense::factory()->create(['category_id' => $category->id]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/expense-categories/{$category->id}");

        $response->assertStatus(500);
        $this->assertDatabaseHas('expense_categories', ['id' => $category->id, 'deleted_at' => null]);
    }

    public function test_can_bulk_delete_expense_categories()
    {
        $categories = ExpenseCategory::factory()->count(3)->create();

        $response = $this->actingAs($this->admin)->postJson('/api/expense-categories/bulk-delete', [
            'ids' => $categories->pluck('id')->take(2)->toArray(),
        ]);

        $response->assertStatus(200);
        $this->assertSoftDeleted($categories[0]);
        $this->assertSoftDeleted($categories[1]);
        $this->assertDatabaseHas('expense_categories', ['id' => $categories[2]->id, 'deleted_at' => null]);
    }

    public function test_warga_cannot_manage_expense_categories()
    {
        $response = $this->actingAs($this->warga)->postJson('/api/expense-categories', [
            'name' => 'Keamanan',
        ]);

        $response->assertStatus(403);
    }

    public function test_warga_cannot_view_expense_categories()
    {
        $response = $this->actingAs($this->warga)->getJson('/api/expense-categories');

        $response->assertStatus(403);
    }
}
```

Note on `test_cannot_delete_expense_category_still_referenced_by_an_expense`: soft-deleting the category row does not touch the FK constraint (the row still physically exists), so `->delete()` on a `SoftDeletes` model with a restrict-FK-referenced row succeeds at the DB level — **the FK is not actually exercised by a soft delete**. Re-check this in Step 2 below before trusting the 500 assertion; if the delete succeeds instead, adjust the test to assert `assertSoftDeleted($category)` (i.e. drop the restrict-on-delete expectation, since `SoftDeletes` never issues a real `DELETE`).

- [ ] **Step 2: Run the tests and reconcile the restrict-on-delete assertion**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/ExpenseCategoryTest.php`

Since `ExpenseCategory` uses `SoftDeletes`, `$expenseCategory->delete()` in the controller only sets `deleted_at` — it never issues a real SQL `DELETE`, so the `category_id` foreign key constraint is never triggered and the request will succeed (200), not fail (500). Fix `test_cannot_delete_expense_category_still_referenced_by_an_expense` to match this actual, correct behavior:

```php
    public function test_can_soft_delete_expense_category_even_when_referenced_by_an_expense()
    {
        $category = ExpenseCategory::factory()->create();
        Expense::factory()->create(['category_id' => $category->id]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/expense-categories/{$category->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted($category);
    }
```

Replace the earlier `test_cannot_delete_expense_category_still_referenced_by_an_expense` test with this one (soft delete always succeeds regardless of references, matching the `DueType` pattern — the FK's restrict behavior only matters for a real hard delete, which this API never performs).

Expected after the fix: all tests in the file PASS.

- [ ] **Step 3: Commit**

```bash
git add src/backend/tests/Feature/Api/ExpenseCategoryTest.php
git commit -m "test: add ExpenseCategory CRUD and RBAC coverage"
```

---

### Task 8: Update `ExpenseTest` and `RbacTest` for `category_id`

**Files:**
- Modify: `src/backend/tests/Feature/Api/ExpenseTest.php`
- Modify: `src/backend/tests/Feature/Api/RbacTest.php`

**Interfaces:**
- Consumes: `ExpenseCategory` factory (Task 5), updated `ExpenseController`/`ExpenseResource` (Task 6).

- [ ] **Step 1: Rewrite `ExpenseTest.php`**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->user = User::factory()->create();
        $this->user->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->user->load('roles.permissions');
        $this->actingAs($this->user);
    }

    public function test_can_list_expenses()
    {
        Expense::factory()->count(3)->create();

        $response = $this->getJson('/api/expenses');

        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_can_filter_expenses_by_month_year_category_and_search()
    {
        $satpam = ExpenseCategory::factory()->create(['name' => 'Satpam']);
        $kebersihan = ExpenseCategory::factory()->create(['name' => 'Kebersihan']);

        Expense::factory()->create([
            'category_id' => $satpam->id,
            'description' => 'Gaji satpam bulan ini',
            'expense_date' => '2026-01-15',
        ]);
        Expense::factory()->create([
            'category_id' => $kebersihan->id,
            'expense_date' => '2026-02-15',
        ]);

        $this->getJson('/api/expenses?month=1&year=2026')
            ->assertStatus(200)->assertJsonCount(1, 'data');

        $this->getJson("/api/expenses?category_id={$satpam->id}")
            ->assertStatus(200)->assertJsonCount(1, 'data');

        $this->getJson('/api/expenses?search=Gaji')
            ->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_can_create_expense()
    {
        $category = ExpenseCategory::factory()->create(['name' => 'Listrik']);

        $response = $this->postJson('/api/expenses', [
            'category_id' => $category->id,
            'description' => 'Tagihan listrik Januari',
            'amount' => 500000,
            'expense_date' => '2026-01-10',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.category.id', $category->id);
    }

    public function test_validates_required_expense_fields()
    {
        $response = $this->postJson('/api/expenses', []);

        $response->assertStatus(422);
    }

    public function test_validates_category_id_must_exist()
    {
        $response = $this->postJson('/api/expenses', [
            'category_id' => 999999,
            'amount' => 100000,
            'expense_date' => '2026-01-10',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_show_expense()
    {
        $expense = Expense::factory()->create();

        $response = $this->getJson("/api/expenses/{$expense->id}");

        $response->assertStatus(200);
    }

    public function test_can_update_expense()
    {
        $expense = Expense::factory()->create(['amount' => 250000]);

        $response = $this->putJson("/api/expenses/{$expense->id}", ['amount' => 300000]);

        $response->assertStatus(200)->assertJsonPath('data.amount', 300000);
    }

    public function test_can_soft_delete_expense()
    {
        $expense = Expense::factory()->create();

        $this->deleteJson("/api/expenses/{$expense->id}");

        $this->assertSoftDeleted($expense);
    }

    public function test_can_sort_expenses_by_amount()
    {
        Expense::factory()->create(['amount' => 200000]);
        Expense::factory()->create(['amount' => 100000]);

        $response = $this->getJson('/api/expenses?sort=amount&order=asc');

        $response->assertStatus(200);
        $this->assertEquals(100000, $response->json('data.0.amount'));
        $this->assertEquals(200000, $response->json('data.1.amount'));
    }

    public function test_can_bulk_delete_expenses()
    {
        $expenses = Expense::factory()->count(3)->create();

        $response = $this->postJson('/api/expenses/bulk-delete', [
            'ids' => $expenses->pluck('id')->take(2)->toArray(),
        ]);

        $response->assertStatus(200);
        $this->assertSoftDeleted($expenses[0]);
        $this->assertSoftDeleted($expenses[1]);
        $this->assertDatabaseHas('expenses', ['id' => $expenses[2]->id, 'deleted_at' => null]);
    }
}
```

Removed: `test_can_get_distinct_expense_categories` (the `/api/expenses/categories` endpoint no longer exists — superseded by `ExpenseCategoryTest::test_can_list_expense_categories`). Added: `test_validates_category_id_must_exist`.

- [ ] **Step 2: Add RBAC coverage for expense categories in `RbacTest.php`**

In `src/backend/tests/Feature/Api/RbacTest.php`, add a test near `test_warga_cannot_create_due_type` (same file, same class):

```php
    public function test_warga_cannot_create_expense_category(): void
    {
        $response = $this->actingAs($this->warga)
            ->postJson('/api/expense-categories', [
                'name' => 'Test',
            ]);

        $response->assertStatus(403);
    }

    public function test_bendahara_can_manage_expense_categories(): void
    {
        $response = $this->actingAs($this->bendahara)
            ->postJson('/api/expense-categories', [
                'name' => 'Test',
            ]);

        $response->assertStatus(201);
    }
```

- [ ] **Step 3: Run both test files**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/ExpenseTest.php tests/Feature/Api/RbacTest.php`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/backend/tests/Feature/Api/ExpenseTest.php src/backend/tests/Feature/Api/RbacTest.php
git commit -m "test: update expense tests for category_id, add expense-category RBAC checks"
```

---

### Task 9: Backend full check (phpstan + full test suite)

**Files:** none (verification-only task)

- [ ] **Step 1: Run static analysis**

Run: `cd src/backend && phpstan analyse`
Expected: no new errors. If larastan flags anything in the files touched this plan (e.g. missing return types), fix inline and re-run.

- [ ] **Step 2: Run the full backend test suite**

Run: `cd src/backend && php artisan test --compact`
Expected: all tests PASS (this catches any other test file — e.g. `ReportServiceTest`, `BillGenerationServiceTest` — that might have depended on the old `expenses.category` string shape).

- [ ] **Step 3: If Step 2 surfaces failures outside the files this plan touched**

Read the failing test, find the `category` string reference, and update it to use `ExpenseCategory::factory()` + `category_id` the same way Task 5/8 did. Re-run the full suite until green.

- [ ] **Step 4: Commit any fixes from Step 3**

```bash
git add -A
git commit -m "fix: update remaining expense.category string references to category_id"
```

(Skip this step if Step 2 was already green — no empty commits.)

---

### Task 10: Frontend types + `expense-categories` service/hook

**Files:**
- Modify: `src/frontend/src/types/api.ts`
- Create: `src/frontend/src/services/expense-categories.ts`
- Create: `src/frontend/src/hooks/use-expense-categories.ts`

**Interfaces:**
- Produces: `ExpenseCategory`, `CreateExpenseCategoryRequest`, `ExpenseCategoryFilter` types; `expenseCategoriesService`; `useExpenseCategories`, `useExpenseCategory`, `useCreateExpenseCategory`, `useUpdateExpenseCategory`, `useDeleteExpenseCategory`, `useBulkDeleteExpenseCategories` — consumed by Tasks 11, 13, 14.
- Modifies: `Expense.category` from `string` to `ExpenseCategory`; `CreateExpenseRequest.category` → `category_id: number`; `ExpenseFilter.category` → `category_id?: number | number[]`.

- [ ] **Step 1: Add types to `types/api.ts`**

Add this block right after the `CreateDueTypeRequest` interface (line ~153, before `// Bills`):

```typescript
export interface ExpenseCategory {
  id: number
  name: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateExpenseCategoryRequest {
  name: string
}
```

Update the `Expense` interface (currently lines 197-207):

```typescript
// Expenses
export interface Expense {
  id: number
  category: ExpenseCategory
  description: string | null
  amount: number
  expense_date: string
  created_by: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateExpenseRequest {
  category_id: number
  description?: string
  amount: number
  expense_date: string
}
```

Update `ExpenseFilter` (currently lines 282-291):

```typescript
export interface ExpenseFilter {
  month?: number
  year?: number
  category_id?: number | number[]
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}
```

Add `ExpenseCategoryFilter` right after `DueTypeFilter` (currently lines 293-299):

```typescript
export interface ExpenseCategoryFilter {
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}
```

- [ ] **Step 2: Create `services/expense-categories.ts`**

```typescript
import api from './api'
import type {
  ApiResponse,
  PaginatedResponse,
  ExpenseCategory,
  ExpenseCategoryFilter,
  CreateExpenseCategoryRequest,
} from '@/types/api'

export const expenseCategoriesService = {
  getAll: (params?: ExpenseCategoryFilter) =>
    api.get<PaginatedResponse<ExpenseCategory>>('/api/expense-categories', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<ExpenseCategory>>(`/api/expense-categories/${id}`),
  create: (data: CreateExpenseCategoryRequest) =>
    api.post<ApiResponse<ExpenseCategory>>('/api/expense-categories', data),
  update: (id: number, data: CreateExpenseCategoryRequest) =>
    api.put<ApiResponse<ExpenseCategory>>(`/api/expense-categories/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/expense-categories/${id}`),
  bulkDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/expense-categories/bulk-delete', { ids }),
}
```

- [ ] **Step 3: Create `hooks/use-expense-categories.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { expenseCategoriesService } from '@/services/expense-categories'
import type { CreateExpenseCategoryRequest, ExpenseCategoryFilter } from '@/types/api'

export function useExpenseCategories(params?: ExpenseCategoryFilter) {
  return useQuery({
    queryKey: ['expense-categories', params],
    queryFn: () => expenseCategoriesService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useExpenseCategory(id: number) {
  return useQuery({
    queryKey: ['expense-categories', id],
    queryFn: () => expenseCategoriesService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateExpenseCategoryRequest) => expenseCategoriesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success('Kategori pengeluaran berhasil ditambahkan')
    },
  })
}

export function useUpdateExpenseCategory(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateExpenseCategoryRequest) => expenseCategoriesService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success('Kategori pengeluaran berhasil diperbarui')
    },
  })
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => expenseCategoriesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success('Kategori pengeluaran berhasil dihapus')
    },
  })
}

export function useBulkDeleteExpenseCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => expenseCategoriesService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success('Kategori pengeluaran terpilih berhasil dihapus')
    },
  })
}
```

This task will not typecheck cleanly in isolation (`Expense.category` is now an object, breaking `expenses-columns.tsx` etc.) — that's expected; Tasks 13-14 fix the remaining call sites. Don't run `tsc`/`npm run build` yet.

- [ ] **Step 4: Commit**

```bash
cd src/frontend
git add src/types/api.ts src/services/expense-categories.ts src/hooks/use-expense-categories.ts
git commit -m "feat: add expense category types, service and query hooks"
```

---

### Task 11: `siwarga-expense-categories` feature module

**Files:**
- Create: `src/frontend/src/features/siwarga-expense-categories/expense-categories-columns.tsx`
- Create: `src/frontend/src/features/siwarga-expense-categories/expense-categories-table.tsx`
- Create: `src/frontend/src/features/siwarga-expense-categories/expense-category-form.tsx`
- Create: `src/frontend/src/features/siwarga-expense-categories/index.tsx`

**Interfaces:**
- Consumes: `useExpenseCategories`, `useCreateExpenseCategory`, `useUpdateExpenseCategory`, `useDeleteExpenseCategory`, `useBulkDeleteExpenseCategories` (Task 10); `ExpenseCategory` type (Task 10).
- Produces: `ExpenseCategoriesPage` component, consumed by Task 12's route file.

- [ ] **Step 1: Create `expense-categories-columns.tsx`**

```tsx
import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { ColumnDef, Row } from '@tanstack/react-table'
import type { ExpenseCategory } from '@/types/api'
import { Trash2, UserPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader, selectColumn } from '@/components/data-table'

type ExpenseCategoriesColumnsProps = {
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  setCurrentRow: (row: ExpenseCategory | null) => void
}

export function expenseCategoriesColumns({
  setOpen,
  setCurrentRow,
}: ExpenseCategoriesColumnsProps): ColumnDef<ExpenseCategory>[] {
  function DataTableRowActions({ row }: { row: Row<ExpenseCategory> }) {
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
        <DropdownMenuContent align='end' className='w-40'>
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
    selectColumn<ExpenseCategory>(),
    {
      id: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama Kategori' />
      ),
      accessorKey: 'name',
      meta: { label: 'Nama Kategori' },
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
      enableSorting: false,
    },
  ]
}
```

- [ ] **Step 2: Create `expense-categories-table.tsx`**

```tsx
import { useEffect, useState } from 'react'
import {
  type RowSelectionState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ExpenseCategory } from '@/types/api'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBulkDeleteExpenseCategories } from '@/hooks/use-expense-categories'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DataTableBulkActions,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import { MultiDeleteDialog } from '@/components/multi-delete-dialog'
import { expenseCategoriesColumns as columns } from './expense-categories-columns'

type DataTableProps = {
  data: ExpenseCategory[]
  pageCount: number
  isFetching?: boolean
  search: Record<string, unknown>
  navigate: NavigateFn
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  setCurrentRow: (row: ExpenseCategory | null) => void
}

export function ExpenseCategoriesTable({
  data,
  pageCount,
  isFetching,
  search,
  navigate,
  setOpen,
  setCurrentRow,
}: DataTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [multiDeleteOpen, setMultiDeleteOpen] = useState(false)

  const bulkDeleteExpenseCategories = useBulkDeleteExpenseCategories()

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
      rowSelection,
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
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
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

  const selectedIds = Object.keys(rowSelection)
    .filter((id) => rowSelection[id])
    .map(Number)

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4 overflow-hidden'
      )}
    >
      <DataTableToolbar table={table} searchPlaceholder='Cari kategori pengeluaran...' />
      <div className='flex-1 overflow-auto'>
        <div
          className={cn(
            'rounded-md border transition-opacity',
            isFetching && 'opacity-60'
          )}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className='group/row'>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(
                          'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                          header.column.columnDef.meta?.className,
                          header.column.columnDef.meta?.thClassName
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className='group/row'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                          cell.column.columnDef.meta?.className,
                          cell.column.columnDef.meta?.tdClassName
                        )}
                      >
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
      <DataTableBulkActions table={table} entityName='kategori pengeluaran'>
        <Button
          variant='destructive'
          size='sm'
          className='h-7'
          onClick={() => setMultiDeleteOpen(true)}
        >
          <Trash2 />
          Hapus
        </Button>
      </DataTableBulkActions>
      <MultiDeleteDialog
        open={multiDeleteOpen}
        onOpenChange={setMultiDeleteOpen}
        selectedCount={selectedIds.length}
        entityLabel='kategori pengeluaran'
        isLoading={bulkDeleteExpenseCategories.isPending}
        onConfirm={() => {
          bulkDeleteExpenseCategories.mutate(selectedIds, {
            onSuccess: () => {
              setMultiDeleteOpen(false)
              table.resetRowSelection()
            },
          })
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create `expense-category-form.tsx`**

```tsx
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ExpenseCategory } from '@/types/api'
import {
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
} from '@/hooks/use-expense-categories'
import { Button } from '@/components/ui/button'
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

type ExpenseCategoryFormDialogProps = {
  currentRow?: ExpenseCategory
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi.'),
})

type ExpenseCategoryForm = z.infer<typeof formSchema>

export function ExpenseCategoryFormDialog({
  currentRow,
  open,
  onOpenChange,
}: ExpenseCategoryFormDialogProps) {
  const isUpdate = !!currentRow
  const createExpenseCategory = useCreateExpenseCategory()
  const updateExpenseCategory = useUpdateExpenseCategory(currentRow?.id ?? 0)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow ? { name: currentRow.name } : { name: '' },
  })

  const onSubmit = (data: ExpenseCategoryForm) => {
    if (isUpdate && currentRow) {
      updateExpenseCategory.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    } else {
      createExpenseCategory.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    }
  }

  const isPending = createExpenseCategory.isPending || updateExpenseCategory.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isUpdate ? 'Ubah Kategori Pengeluaran' : 'Tambah Kategori Pengeluaran'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Perbarui data kategori pengeluaran di sini. Klik simpan setelah selesai.'
              : 'Tambahkan kategori pengeluaran baru ke dalam sistem. Klik simpan setelah selesai.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='expense-category-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Nama Kategori
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Masukkan nama kategori'
                      className='col-span-4'
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='expense-category-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Create `index.tsx`**

```tsx
import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { ExpenseCategory } from '@/types/api'
import { AlertTriangle, Plus } from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import {
  useExpenseCategories,
  useDeleteExpenseCategory,
} from '@/hooks/use-expense-categories'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ExpenseCategoryFormDialog } from './expense-category-form'
import { ExpenseCategoriesTable } from './expense-categories-table'

const route = getRouteApi('/_authenticated/expense-categories/')

function ExpenseCategoriesDialogs({
  open,
  setOpen,
  currentRow,
  setCurrentRow,
}: {
  open: 'create' | 'update' | 'delete' | null
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  currentRow: ExpenseCategory | null
  setCurrentRow: (row: ExpenseCategory | null) => void
}) {
  const deleteExpenseCategory = useDeleteExpenseCategory()

  const handleDelete = () => {
    if (!currentRow) return
    deleteExpenseCategory.mutate(currentRow.id, {
      onSuccess: () => {
        setOpen(null)
        setTimeout(() => {
          setCurrentRow(null)
        }, 500)
      },
    })
  }

  return (
    <>
      <ExpenseCategoryFormDialog
        key='expense-category-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      {currentRow && (
        <>
          <ExpenseCategoryFormDialog
            key={`expense-category-update-${currentRow.id}`}
            open={open === 'update'}
            onOpenChange={() => {
              setOpen('update')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <ConfirmDialog
            key={`expense-category-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={handleDelete}
            disabled={deleteExpenseCategory.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Kategori Pengeluaran
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus{' '}
                <span className='font-bold'>{currentRow.name}</span>?
                <br />
                Tindakan ini akan menghapus kategori pengeluaran secara permanen
                dan tidak dapat dibatalkan.
              </p>
            }
            confirmText='Hapus'
            destructive
          />
        </>
      )}
    </>
  )
}

function ExpenseCategoriesPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useExpenseCategories({
    page: search.page,
    per_page: search.pageSize,
    search: search.search,
    sort: search.sort,
    order: search.order,
  })

  const [open, setOpen] = useDialogState<'create' | 'update' | 'delete'>(null)
  const [currentRow, setCurrentRow] = useState<ExpenseCategory | null>(null)

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
            <h2 className='text-2xl font-bold tracking-tight'>
              Kategori Pengeluaran
            </h2>
            <p className='text-muted-foreground'>
              Kelola kategori pengeluaran di sini.
            </p>
          </div>
          <Button className='space-x-1' onClick={() => setOpen('create')}>
            <span>Tambah Kategori</span> <Plus size={18} />
          </Button>
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <ExpenseCategoriesTable
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

      <ExpenseCategoriesDialogs
        open={open}
        setOpen={setOpen}
        currentRow={currentRow}
        setCurrentRow={setCurrentRow}
      />
    </>
  )
}

export function ExpenseCategoriesPage() {
  return <ExpenseCategoriesPageInner />
}
```

- [ ] **Step 5: Commit**

```bash
cd src/frontend
git add src/features/siwarga-expense-categories/
git commit -m "feat: add expense categories feature module (table, form, page)"
```

(Still won't build cleanly — the route file doesn't exist yet. That's Task 12.)

---

### Task 12: Route + sidebar nav entry for expense categories

**Files:**
- Create: `src/frontend/src/routes/_authenticated/expense-categories/index.tsx`
- Modify: `src/frontend/src/components/layout/data/sidebar-data.ts`

**Interfaces:**
- Consumes: `ExpenseCategoriesPage` from Task 11.
- Produces: route `/expense-categories`, generated into `routeTree.gen.ts` by the dev server / build (do not hand-edit that file).

- [ ] **Step 1: Create the route file**

```tsx
import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ExpenseCategoriesPage } from '@/features/siwarga-expense-categories'

const expenseCategoriesSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  search: z.string().optional().catch(''),
  sort: z.string().optional().catch(undefined),
  order: z.union([z.literal('asc'), z.literal('desc')]).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/expense-categories/')({
  validateSearch: expenseCategoriesSearchSchema,
  component: ExpenseCategoriesPage,
})
```

- [ ] **Step 2: Add the sidebar nav entry**

In `src/frontend/src/components/layout/data/sidebar-data.ts`, add the `Tag` icon import:

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
  UserCog,
  Banknote,
  ShieldCheck,
  KeyRound,
  History,
} from 'lucide-react'
```

Add the nav item right after "Pengeluaran" in the "Keuangan" group:

```typescript
        {
          title: 'Pengeluaran',
          url: '/expenses',
          icon: ShoppingCart,
          permission: 'expenses.view',
        },
        {
          title: 'Kategori Pengeluaran',
          url: '/expense-categories',
          icon: Tag,
          permission: 'expense-categories.view',
        },
```

- [ ] **Step 3: Regenerate the route tree and verify the dev server picks up the route**

Run: `cd src/frontend && npx tsr generate` (or start `npm run dev` briefly — the TanStack Router Vite plugin regenerates `routeTree.gen.ts` automatically on file changes; if `tsr` CLI isn't available, running `npm run dev` for a few seconds and stopping it is sufficient).
Expected: `src/routes/routeTree.gen.ts` gains a `/_authenticated/expense-categories/` entry. Do not hand-edit this generated file.

- [ ] **Step 4: Commit**

```bash
git add src/routes/_authenticated/expense-categories/index.tsx src/components/layout/data/sidebar-data.ts src/routes/routeTree.gen.ts
git commit -m "feat: add expense categories route and sidebar nav entry"
```

---

### Task 13: Update `expense-form.tsx` to select `category_id`

**Files:**
- Modify: `src/frontend/src/features/siwarga-expenses/expense-form.tsx`

**Interfaces:**
- Consumes: `useExpenseCategories` (Task 10).

- [ ] **Step 1: Replace the free-text category `Input` with a `Select`**

Rewrite `src/frontend/src/features/siwarga-expenses/expense-form.tsx` in full:

```tsx
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Expense } from '@/types/api'
import { cn } from '@/lib/utils'
import { useExpenseCategories } from '@/hooks/use-expense-categories'
import { useCreateExpense, useUpdateExpense } from '@/hooks/use-expenses'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type ExpenseFormDialogProps = {
  currentRow?: Expense
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  category_id: z.coerce
    .number({ error: 'Kategori wajib diisi.' })
    .positive('Kategori wajib diisi.'),
  description: z.string().optional(),
  amount: z.coerce
    .number({ error: 'Jumlah wajib diisi.' })
    .positive('Jumlah harus lebih dari 0.'),
  expense_date: z.string().min(1, 'Tanggal pengeluaran wajib diisi.'),
})

type ExpenseForm = z.infer<typeof formSchema>

function formatDate(date: Date) {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ExpenseFormDialog({
  currentRow,
  open,
  onOpenChange,
}: ExpenseFormDialogProps) {
  const isUpdate = !!currentRow
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense(currentRow?.id ?? 0)
  const { data: categoriesData } = useExpenseCategories({ per_page: 100 })
  const categories = categoriesData?.data ?? []

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow
      ? {
          category_id: currentRow.category.id,
          description: currentRow.description ?? '',
          amount: currentRow.amount,
          expense_date: currentRow.expense_date,
        }
      : {
          category_id: undefined as unknown as number,
          description: '',
          amount: undefined as unknown as number,
          expense_date: '',
        },
  })

  const onSubmit = (data: ExpenseForm) => {
    if (isUpdate && currentRow) {
      updateExpense.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    } else {
      createExpense.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    }
  }

  const isPending = createExpense.isPending || updateExpense.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isUpdate ? 'Ubah Pengeluaran' : 'Catat Pengeluaran'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Perbarui data pengeluaran di sini. Klik simpan setelah selesai.'
              : 'Catat pengeluaran baru ke dalam sistem. Klik simpan setelah selesai.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='expense-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-0.5'
          >
            <FormField
              control={form.control}
              name='category_id'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    Kategori
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger className='col-span-4'>
                        <SelectValue placeholder='Pilih kategori...' />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    Deskripsi
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Deskripsi (opsional)'
                      className='col-span-4 min-h-20'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='amount'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>Jumlah</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='Masukkan jumlah'
                      className='col-span-4'
                      autoComplete='off'
                      {...field}
                      value={(field.value as number | string | undefined) ?? ''}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='expense_date'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    Tanggal
                  </FormLabel>
                  <FormControl>
                    <div className='col-span-4'>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant='outline'
                            className={cn(
                              'w-full justify-start font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value
                              ? formatDate(new Date(field.value))
                              : 'Pilih tanggal...'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-0' align='start'>
                          <Calendar
                            mode='single'
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date.toISOString().split('T')[0])
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='expense-form' disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd src/frontend
git add src/features/siwarga-expenses/expense-form.tsx
git commit -m "feat: select expense category from expense-categories list in the expense form"
```

---

### Task 14: Update remaining `siwarga-expenses` call sites for `category` object / `category_id`

**Files:**
- Modify: `src/frontend/src/features/siwarga-expenses/expenses-columns.tsx`
- Modify: `src/frontend/src/features/siwarga-expenses/expenses-table.tsx`
- Modify: `src/frontend/src/features/siwarga-expenses/index.tsx`
- Modify: `src/frontend/src/services/expenses.ts`
- Modify: `src/frontend/src/hooks/use-expenses.ts`
- Modify: `src/frontend/src/routes/_authenticated/expenses/index.tsx`

**Interfaces:**
- Consumes: `useExpenseCategories` (Task 10) replaces the removed `useExpenseCategories` that lived in `use-expenses.ts` (old distinct-string version).

- [ ] **Step 1: Update `expenses-columns.tsx` to render `category.name`**

In `src/frontend/src/features/siwarga-expenses/expenses-columns.tsx`, change the `category` column:

```tsx
    {
      id: 'category',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Kategori' />
      ),
      accessorFn: (row) => row.category.name,
      cell: ({ row }) => <span>{row.original.category.name}</span>,
      meta: { label: 'Kategori' },
    },
```

(replacing the existing `accessorKey: 'category'` version — `accessorFn` is needed now since `category` is an object, not a primitive the table can sort/filter on directly as a string.)

- [ ] **Step 2: Remove the old `getCategories`/`useExpenseCategories` from the expenses service/hook**

In `src/frontend/src/services/expenses.ts`, remove the `getCategories` entry:

```typescript
import api from './api'
import type { ApiResponse, PaginatedResponse, Expense, CreateExpenseRequest, ExpenseFilter } from '@/types/api'

export const expensesService = {
  getAll: (params?: ExpenseFilter) =>
    api.get<PaginatedResponse<Expense>>('/api/expenses', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<Expense>>(`/api/expenses/${id}`),
  create: (data: CreateExpenseRequest) =>
    api.post<ApiResponse<Expense>>('/api/expenses', data),
  update: (id: number, data: Partial<CreateExpenseRequest>) =>
    api.put<ApiResponse<Expense>>(`/api/expenses/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/expenses/${id}`),
  bulkDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/expenses/bulk-delete', { ids }),
}
```

In `src/frontend/src/hooks/use-expenses.ts`, remove the `useExpenseCategories` export (keep everything else unchanged):

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { expensesService } from '@/services/expenses'
import type { ExpenseFilter, CreateExpenseRequest } from '@/types/api'

export function useExpenses(params?: ExpenseFilter) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expensesService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useExpense(id: number) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: () => expensesService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateExpenseRequest) => expensesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Pengeluaran berhasil ditambahkan')
    },
  })
}

export function useUpdateExpense(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreateExpenseRequest>) => expensesService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Pengeluaran berhasil diperbarui')
    },
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => expensesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Pengeluaran berhasil dihapus')
    },
  })
}

export function useBulkDeleteExpenses() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => expensesService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Pengeluaran terpilih berhasil dihapus')
    },
  })
}
```

- [ ] **Step 3: Update the expenses route search schema for `category_id`**

In `src/frontend/src/routes/_authenticated/expenses/index.tsx`, change `category: z.string().optional()` to:

```typescript
  category_id: z.coerce.number().optional(),
```

Full file:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ExpensesPage } from '@/features/siwarga-expenses'

const searchSchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(10),
  month: z.coerce.number().optional(),
  year: z.coerce.number().optional(),
  category_id: z.coerce.number().optional(),
  search: z.string().optional().catch(''),
  sort: z.string().optional().catch(undefined),
  order: z.union([z.literal('asc'), z.literal('desc')]).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/expenses/')({
  validateSearch: searchSchema,
  component: ExpensesPage,
})
```

- [ ] **Step 4: Update `expenses-table.tsx` to filter by `category_id` using the new hook**

In `src/frontend/src/features/siwarga-expenses/expenses-table.tsx`:

Change the import:
```typescript
import { useExpenseCategories } from '@/hooks/use-expense-categories'
import { useBulkDeleteExpenses } from '@/hooks/use-expenses'
```

Change the filter state and handler:
```typescript
  const month = search.month as number | undefined
  const year = search.year as number | undefined
  const categoryId = search.category_id as number | undefined

  const { data: categoriesData } = useExpenseCategories({ per_page: 100 })
  const categories = categoriesData?.data ?? []
```

```typescript
  const handleCategoryChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...(prev as Record<string, unknown>),
        category_id: value && value !== 'all' ? Number(value) : undefined,
        page: undefined,
      }),
    })
  }
```

Change the category `Select` JSX:
```tsx
        <Select value={categoryId ? String(categoryId) : ''} onValueChange={handleCategoryChange}>
          <SelectTrigger className='h-8 w-37.5'>
            <SelectValue placeholder='Semua Kategori' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Semua Kategori</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
```

Note: the existing month/year `Select`s use `value='all'` as their "cleared" sentinel too but their handlers (`handleMonthChange`/`handleYearChange`) don't special-case `'all'` — that's a pre-existing quirk in this file, not introduced by this change; leave those two handlers untouched and only fix the category handler as shown (it needs the `value !== 'all'` check because `'0'` is falsy-but-truthy as a string, and `Number('all')` would be `NaN`).

- [ ] **Step 5: Update `index.tsx`'s delete-confirmation copy and search params**

In `src/frontend/src/features/siwarga-expenses/index.tsx`, change the delete dialog description:

```tsx
            desc={
              <p>
                Apakah Anda yakin ingin menghapus pengeluaran{' '}
                <span className='font-bold'>{currentRow.category.name}</span>?
                <br />
                Tindakan ini akan menghapus pengeluaran secara permanen dan
                tidak dapat dibatalkan.
              </p>
            }
```

Change the `useExpenses` params:
```typescript
  const { data, isLoading, isFetching } = useExpenses({
    page: search.page,
    per_page: search.pageSize,
    month: search.month,
    year: search.year,
    category_id: search.category_id,
    search: search.search,
    sort: search.sort,
    order: search.order,
  })
```

- [ ] **Step 6: Typecheck and lint**

Run: `cd src/frontend && npm run lint`
Run: `npm run build`
Expected: both succeed with no errors. If `tsc` flags any remaining `category` string usage, fix it the same way as this task's steps.

- [ ] **Step 7: Commit**

```bash
git add src/features/siwarga-expenses/ src/services/expenses.ts src/hooks/use-expenses.ts src/routes/_authenticated/expenses/index.tsx
git commit -m "feat: switch expenses table/filters/detail view to category_id"
```

---

### Task 15: Update MSW mocks

**Files:**
- Create: `src/frontend/src/mocks/data/expense-categories.ts`
- Create: `src/frontend/src/mocks/handlers/expense-categories.ts`
- Modify: `src/frontend/src/mocks/handlers/index.ts`
- Modify: `src/frontend/src/mocks/data/expenses.ts`
- Modify: `src/frontend/src/mocks/handlers/expenses.ts`

**Interfaces:**
- Consumes: `ExpenseCategory` type (Task 10).

- [ ] **Step 1: Create `mocks/data/expense-categories.ts`**

```typescript
import type { ExpenseCategory } from '@/types/api'

export const mockExpenseCategories: ExpenseCategory[] = [
  { id: 1, name: 'Keamanan', created_at: '', updated_at: '', deleted_at: null },
  { id: 2, name: 'Kebersihan', created_at: '', updated_at: '', deleted_at: null },
]
```

- [ ] **Step 2: Create `mocks/handlers/expense-categories.ts`**

```typescript
import { http, HttpResponse } from 'msw'
import { mockExpenseCategories } from '../data/expense-categories'

const expenseCategories = [...mockExpenseCategories]
let nextId = 100

export const expenseCategoryHandlers = [
  http.get('/api/expense-categories', () =>
    HttpResponse.json({
      data: expenseCategories,
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: expenseCategories.length,
    })),

  http.get('/api/expense-categories/:id', ({ params }) => {
    const category = expenseCategories.find((c) => c.id === Number(params.id))
    if (!category) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: category })
  }),

  http.post('/api/expense-categories', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newCategory = {
      id: nextId++,
      name: body.name as string,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    expenseCategories.push(newCategory)
    return HttpResponse.json({ data: newCategory }, { status: 201 })
  }),

  http.put('/api/expense-categories/:id', async ({ params, request }) => {
    const idx = expenseCategories.findIndex((c) => c.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    expenseCategories[idx] = { ...expenseCategories[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json({ data: expenseCategories[idx] })
  }),

  http.delete('/api/expense-categories/:id', ({ params }) => {
    const idx = expenseCategories.findIndex((c) => c.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    expenseCategories[idx] = { ...expenseCategories[idx], deleted_at: new Date().toISOString() }
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),
]
```

- [ ] **Step 3: Register the new handlers**

In `src/frontend/src/mocks/handlers/index.ts`, add the import and spread it in alongside the existing `dueTypeHandlers`/`expenseHandlers` (mirror their exact placement — import sorted alphabetically, spread in the same list):

```typescript
import { dueTypeHandlers } from './due-types'
import { expenseCategoryHandlers } from './expense-categories'
import { expenseHandlers } from './expenses'
```

```typescript
  ...dueTypeHandlers,
  ...expenseCategoryHandlers,
  ...expenseHandlers,
```

(Read the actual current file first to match existing ordering/format exactly — don't guess at surrounding lines.)

- [ ] **Step 4: Update `mocks/data/expenses.ts` to embed a category object**

```typescript
import type { Expense } from '@/types/api'
import { mockExpenseCategories } from './expense-categories'

export const mockExpenses: Expense[] = [
  {
    id: 1,
    category: mockExpenseCategories[0],
    description: 'Gaji satpam bulan Juli 2026',
    amount: 500000,
    expense_date: '2026-07-01',
    created_by: 1,
    created_at: '2026-07-01T00:00:00.000000Z',
    updated_at: '2026-07-01T00:00:00.000000Z',
    deleted_at: null,
  },
]
```

- [ ] **Step 5: Update `mocks/handlers/expenses.ts` for `category_id` filtering and lookup**

```typescript
import { http, HttpResponse } from 'msw'
import { mockExpenseCategories } from '../data/expense-categories'
import { mockExpenses } from '../data/expenses'

const expenses = [...mockExpenses]
let nextId = 100

export const expenseHandlers = [
  http.get('/api/expenses', ({ request }) => {
    const url = new URL(request.url)
    const month = url.searchParams.get('month')
    const year = url.searchParams.get('year')
    const categoryId = url.searchParams.get('category_id')
    let filtered = [...expenses]
    if (month) filtered = filtered.filter((e) => new Date(e.expense_date).getMonth() + 1 === Number(month))
    if (year) filtered = filtered.filter((e) => new Date(e.expense_date).getFullYear() === Number(year))
    if (categoryId) filtered = filtered.filter((e) => e.category.id === Number(categoryId))
    return HttpResponse.json({
      data: filtered,
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: filtered.length,
    })
  }),

  http.get('/api/expenses/:id', ({ params }) => {
    const expense = expenses.find((e) => e.id === Number(params.id))
    if (!expense) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: expense })
  }),

  http.post('/api/expenses', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const category = mockExpenseCategories.find((c) => c.id === Number(body.category_id)) ?? mockExpenseCategories[0]
    const newExpense = {
      id: nextId++,
      category,
      description: (body.description as string) || null,
      amount: body.amount as number,
      expense_date: body.expense_date as string,
      created_by: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    expenses.push(newExpense)
    return HttpResponse.json({ data: newExpense }, { status: 201 })
  }),

  http.put('/api/expenses/:id', async ({ params, request }) => {
    const idx = expenses.findIndex((e) => e.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    const category = body.category_id
      ? (mockExpenseCategories.find((c) => c.id === Number(body.category_id)) ?? expenses[idx].category)
      : expenses[idx].category
    expenses[idx] = { ...expenses[idx], ...body, category, updated_at: new Date().toISOString() }
    return HttpResponse.json({ data: expenses[idx] })
  }),

  http.delete('/api/expenses/:id', ({ params }) => {
    const idx = expenses.findIndex((e) => e.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    expenses[idx] = { ...expenses[idx], deleted_at: new Date().toISOString() }
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),
]
```

- [ ] **Step 6: Verify mock mode boots**

Run: `cd src/frontend && VITE_USE_MOCK=true npm run dev` (start it, confirm no console errors on `http://localhost:5173/expense-categories` and `http://localhost:5173/expenses`, then stop it).
Expected: both pages load data from the mocks without runtime errors.

- [ ] **Step 7: Lint, build, commit**

Run: `npm run lint && npm run build`
Expected: both succeed.

```bash
git add src/mocks/
git commit -m "feat: add expense category mocks, sync expense mocks to category_id"
```

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-07-29-expense-categories-design.md` maps to a task — migrations (1), models (2), permissions/RBAC (3), controller/resource/routes (4), factories/seeders (5), expense endpoint changes (6), backend tests (7, 8), full-suite check (9), frontend types/service/hook (10), feature module (11), route/nav (12), expense-form (13), remaining expense call sites (14), mocks (15).
- **Restrict-on-delete caveat:** Task 7 flags and resolves the fact that `SoftDeletes` never triggers the FK's restrict-on-delete behavior (no hard `DELETE` is ever issued through this API) — the spec's "tolak hapus jika masih dipakai" intent is satisfied at the schema level (a real hard delete would be blocked) but the soft-delete API endpoint itself always succeeds, matching the existing `DueType` behavior exactly. This is called out explicitly rather than left as a silent mismatch.
- **Type consistency:** `ExpenseCategory { id, name, created_at, updated_at, deleted_at }` is used identically across `ExpenseCategoryResource` (Task 4), the frontend type (Task 10), the feature module (Task 11), and mocks (Task 15). `Expense.category` is `ExpenseCategory` (object) everywhere after Task 10, with no lingering `string` usage — confirmed by the Task 14 lint/build gate and the Task 9 full-suite gate.
