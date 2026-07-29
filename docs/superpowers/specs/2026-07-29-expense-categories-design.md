# Kategori Pengeluaran (Expense Categories) CRUD — Design

## Background

`expenses.category` is currently a free-text `string(100)` column, with categories discovered ad-hoc via a `GET /expenses/categories` distinct-value endpoint. This spec turns categories into a first-class, manageable resource (`expense_categories` table) with its own CRUD UI, and makes `expenses.category_id` a required foreign key.

Since the project is pre-launch (development stage, reset via `migrate:fresh --seed`), the existing `create_expenses_table` migration is edited **in place** rather than adding a new column-altering migration — per explicit user instruction, no data-preservation concerns.

## Backend

### Migrations

- New migration `database/migrations/2026_07_27_143641_create_expense_categories_table.php` (timestamp placed *before* the expenses migration, `..._143642_...`, so `expense_categories` exists first):
  ```php
  Schema::create('expense_categories', function (Blueprint $table) {
      $table->id();
      $table->string('name', 100)->unique();
      $table->softDeletes();
      $table->timestamps();
  });
  ```
- Edit `database/migrations/2026_07_27_143642_create_expenses_table.php` directly:
  - Remove `$table->string('category', 100);`
  - Add `$table->foreignId('category_id')->constrained('expense_categories');` (required, default RESTRICT on delete — same style as `due_type_id` on `bills`).

### Models

- New `App\Models\ExpenseCategory`: `use HasFactory, SoftDeletes;`, `fillable = ['name']`.
- `App\Models\Expense`: `fillable` swaps `category` → `category_id`; add `category(): BelongsTo` (→ `ExpenseCategory`).

### Permissions / RBAC

- Add to `Permission::SYSTEM_PERMISSIONS`:
  - `expense-categories.view` => 'Lihat kategori pengeluaran'
  - `expense-categories.manage` => 'Kelola kategori pengeluaran'
- New `App\Policies\ExpenseCategoryPolicy` (mirrors `DueTypePolicy`): `viewAny`/`view` → `expense-categories.view`; `create`/`update`/`delete` → `expense-categories.manage`.
- `AppServiceProvider::boot()`: register gates the same way as due-types:
  ```php
  Gate::define('expense-categories.view', [ExpenseCategoryPolicy::class, 'viewAny']);
  Gate::define('expense-categories.manage', [ExpenseCategoryPolicy::class, 'create']);
  ```
  Add `ExpenseCategory::class` to the model list used for the generic per-model policy binding loop (same as `DueType::class`).
- `RoleSeeder`: `admin` gets all permissions already (no change needed); add `'expense-categories.view', 'expense-categories.manage'` to the `bendahara` permission list (alongside existing `expenses.*`).

### Controller / Resource / Routes

- New `App\Http\Controllers\Api\ExpenseCategoryController`, structurally identical to `DueTypeController`: `index` (search by `name`, sort by `name`/`created_at`), `store`/`update` (`name: required|string|max:100` on store, `sometimes` on update), `show`, `destroy`, `bulkDestroy`.
- New `App\Http\Resources\ExpenseCategoryResource`: `id`, `name`, `created_at`, `updated_at`, `deleted_at`.
- Routes in `routes/api.php`, mirroring the `due-types` block:
  ```php
  Route::get('expense-categories', [...index])->middleware('can:expense-categories.view');
  Route::post('expense-categories', [...store])->middleware('can:expense-categories.manage');
  Route::post('expense-categories/bulk-delete', [...bulkDestroy])->middleware('can:expense-categories.manage');
  Route::get('expense-categories/{expenseCategory}', [...show])->middleware('can:expense-categories.view');
  Route::put('expense-categories/{expenseCategory}', [...update])->middleware('can:expense-categories.manage');
  Route::delete('expense-categories/{expenseCategory}', [...destroy])->middleware('can:expense-categories.manage');
  ```

### Expense endpoint changes

- `ExpenseController`: remove the `categories()` action (and its route) — superseded by the new resource. `store`/`update` validation: `category_id` replaces `category` (`required|exists:expense_categories,id` on store, `sometimes|exists:expense_categories,id` on update). `index` category filter (`$request->category`) becomes `category_id` (single or array via `whereIn`).
- `ExpenseResource`: `'category' => $this->category` (string) becomes `'category' => new ExpenseCategoryResource($this->whenLoaded('category'))` — controller eager-loads `category` in `index`/`show`.

### Factories / Seeders

- New `ExpenseCategoryFactory` (`name` via `fake()->word()` or a fixed list like due-type names).
- New `ExpenseCategorySeeder` seeding a fixed set of realistic categories (e.g. Kebersihan, Keamanan, Listrik & Air, Perbaikan Fasilitas, Konsumsi Acara, Lain-lain), run from `DatabaseSeeder` before `ExpenseSeeder`.
- `ExpenseFactory`/`ExpenseSeeder`: replace random category string generation with `category_id` picked from existing `ExpenseCategory` rows (factory: `ExpenseCategory::factory()` or `ExpenseCategory::inRandomOrder()->first()->id`).

### Tests

- New `tests/Feature/Api/ExpenseCategoryTest.php`, mirroring `DueTypeTest.php`: index/search/sort, store validation + happy path, show, update, destroy (including the restrict-on-delete-when-referenced case: create an expense against a category, assert deleting that category fails), bulkDestroy, RBAC (403 for `warga`, `bendahara` allowed).
- Update `tests/Feature/Api/ExpenseTest.php`: swap `category` string payloads/assertions for `category_id` + related `ExpenseCategory` fixtures; remove/replace the `categories()` endpoint test.
- Update `tests/Feature/Api/RbacTest.php` for the two new permissions.

## Frontend

### New feature module `src/features/siwarga-expense-categories/`

Mirrors `siwarga-due-types` file-for-file (no separate provider — table/index manage dialog state locally, per the existing due-types pattern):
- `expense-categories-columns.tsx` — single `name` column + actions.
- `expense-categories-table.tsx` — data table w/ bulk delete, using shared `data-table` primitives.
- `expense-category-form.tsx` — create/edit dialog, single `name` field, zod schema `{ name: z.string().min(1) }`.
- `index.tsx` — page composition (header, table, dialogs), same shape as `siwarga-due-types/index.tsx`.

### Data layer

- `src/services/expense-categories.ts` (axios client) + `src/hooks/use-expense-categories.ts` (TanStack Query: `useExpenseCategories`, `useCreateExpenseCategory`, `useUpdateExpenseCategory`, `useDeleteExpenseCategory`, `useBulkDeleteExpenseCategories`), mirroring `use-due-types.ts`.

### Routing / Nav

- New route file(s) under `src/routes/_authenticated/expense-categories/index.tsx`, same shape as `due-types/index.tsx`.
- `src/components/layout/data/sidebar-data.ts`: add a "Kategori Pengeluaran" entry near "Pengeluaran", `permission: 'expense-categories.view'`.

### Expense feature updates

- `src/types/api.ts`: `Expense.category: string` → `category: ExpenseCategory` (new type `{ id, name, created_at, updated_at, deleted_at }`); `ExpenseFilters.category?: string | string[]` → `category_id?: number | number[]`.
- `expense-form.tsx`: replace the free-text `Input` for "Kategori" with a `Select` populated from `useExpenseCategories()` (value = category id), submitting `category_id`. Zod schema: `category_id: z.coerce.number({ error: 'Kategori wajib diisi.' })`.
- `expenses-columns.tsx`: render `row.original.category.name` instead of the raw string; category filter (if present) sources options from `useExpenseCategories()` instead of the old distinct-categories endpoint.
- `src/mocks/data/expense-categories.ts` + `src/mocks/handlers/expense-categories.ts` (new, mirroring due-types mocks); `src/mocks/data/expenses.ts` and `src/mocks/handlers/expenses.ts` updated so mock expense records carry a `category` object and filtering works on `category_id`.

## Out of scope

- No data-preservation/backfill migration for existing string categories (dev-stage reset is acceptable per user).
- No change to `houses`/`residents`/other resources.
- No UI for reassigning a category on bulk expenses beyond the existing single-row edit form.
