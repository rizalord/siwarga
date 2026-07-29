# Soft-delete Filter, Restore & Force-delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a three-state soft-delete filter plus permission-gated restore and permanent-delete actions to the eight standalone soft-deletable resource lists.

**Architecture:** Implement one complete ExpenseCategory vertical slice first, including API, RBAC, activity logging, React UI, and MSW behavior. Reuse the established service/hook/table patterns to replicate the same contract for Residents, Houses, DueTypes, Bills, Payments, Expenses, and Users; keep `trashed` as a URL search parameter rather than a table column filter.

**Tech Stack:** Laravel 13 / PHP 8.3 / Eloquent SoftDeletes / Sanctum / custom Gate + Policy RBAC / PHPUnit; React 19 / TypeScript / TanStack Router + Query + Table / shadcn Select and dialogs / MSW.

## Global Constraints

- Apply the filter to exactly Residents, Houses, DueTypes, Bills, Payments, Expenses, ExpenseCategories, and Users; do not modify HouseResident.
- The default and any invalid `trashed` value must exclude soft-deleted rows; only `with` and `only` change the query.
- Use exactly one permission per resource, `<resource>.trash`, for both restore and force-delete.
- Permission descriptions must be exactly: `Kelola data penghuni terhapus`, `Kelola data rumah terhapus`, `Kelola data jenis iuran terhapus`, `Kelola data tagihan terhapus`, `Kelola data pembayaran terhapus`, `Kelola data pengeluaran terhapus`, `Kelola data kategori pengeluaran terhapus`, and `Kelola data user terhapus`.
- Bendahara receives only `bills.trash`, `payments.trash`, `expenses.trash`, and `expense-categories.trash`; Admin receives all through `Permission::all()`; Warga receives none.
- No deleted badge/indicator and no separate restore versus force-delete permission.
- Preserve existing active-row actions and default list behavior.
- Backend changes require the affected PHPUnit test and `vendor/bin/pint --dirty --format agent`; frontend changes require `npm run lint` and `npm run build`.
- Do not hand-edit generated `src/frontend/src/routeTree.gen.ts`.

---

### Task 1: Add shared backend soft-delete primitives

**Files:**
- Modify: `src/backend/app/Http/Controllers/Controller.php`
- Modify: `src/backend/app/Observers/ActivityLogObserver.php`
- Test: `src/backend/tests/Feature/Api/ExpenseCategoryTest.php`

**Interfaces:**
- Produces `protected function applyTrashedFilter(Builder $query, Request $request): Builder`.
- Produces `protected function bulkRestore(Request $request, string $modelClass): JsonResponse` and `protected function bulkForceDelete(Request $request, string $modelClass): JsonResponse`.
- Produces observer handlers `restored(Model $model): void` and `forceDeleted(Model $model): void`.

- [ ] **Step 1: Add the failing shared behavior tests**

Extend `src/backend/tests/Feature/Api/ExpenseCategoryTest.php` with tests that will exercise the shared helpers through the ExpenseCategory endpoints: `trashed=with` returns active plus trashed rows, `trashed=only` returns only trashed rows, an absent or invalid value returns only active rows, bulk restore returns the restored count, and bulk force-delete returns the permanently removed count.

- [ ] **Step 2: Run the focused tests and verify the new cases fail**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/ExpenseCategoryTest.php`

Expected: the existing tests pass and the new filter/restore/force-delete cases fail because the helpers and endpoints do not exist yet.

- [ ] **Step 3: Implement the filter, bulk helpers, and observer handlers**

Add this exact filter implementation to `Controller`:

```php
protected function applyTrashedFilter(Builder $query, Request $request): Builder
{
    return match ($request->string('trashed')->toString()) {
        'with' => $query->withTrashed(),
        'only' => $query->onlyTrashed(),
        default => $query,
    };
}
```

The bulk helpers must validate `ids` as `required|array|min:1` with integer elements, call `withTrashed()->whereIn('id', $ids)->restore()` or `forceDelete()`, and return `['data' => null, 'message' => "{$count} data berhasil dipulihkan"]` or `['data' => null, 'message' => "{$count} data berhasil dihapus permanen"]`. Add observer messages exactly as `Memulihkan {$label}: {$identifier}` with action `restored`, and `Menghapus permanen {$label}: {$identifier}` with action `force_deleted`.

- [ ] **Step 4: Format and rerun the focused test file**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && php artisan test --compact tests/Feature/Api/ExpenseCategoryTest.php`

Expected: formatting succeeds; the shared helper tests may still fail until Task 2 adds the reference routes and controller methods, while existing tests remain green.

- [ ] **Step 5: Commit the shared backend primitives**

```bash
git add src/backend/app/Http/Controllers/Controller.php src/backend/app/Observers/ActivityLogObserver.php src/backend/tests/Feature/Api/ExpenseCategoryTest.php
git commit -m "feat: add soft-delete query and bulk action helpers"
```

### Task 2: Complete the ExpenseCategory backend vertical slice

**Files:**
- Modify: `src/backend/app/Models/Permission.php`
- Modify: `src/backend/app/Policies/ExpenseCategoryPolicy.php`
- Modify: `src/backend/app/Providers/AppServiceProvider.php`
- Modify: `src/backend/app/Http/Controllers/Api/ExpenseCategoryController.php`
- Modify: `src/backend/routes/api.php`
- Modify: `src/backend/database/seeders/RoleSeeder.php`
- Test: `src/backend/tests/Feature/Api/ExpenseCategoryTest.php`

**Interfaces:**
- Produces `expense-categories.trash` and `ExpenseCategoryPolicy::restore(User $user): bool`.
- Produces `POST /api/expense-categories/{expenseCategory}/restore`, `DELETE /api/expense-categories/{expenseCategory}/force-delete`, `POST /api/expense-categories/bulk-restore`, and `POST /api/expense-categories/bulk-force-delete`.

- [ ] **Step 1: Add the failing permission, route, and controller tests**

Add PHPUnit tests for: both list modes, single restore success and 403 without `expense-categories.trash`, single force-delete success plus `assertDatabaseMissing`, bulk restore and bulk force-delete success, and 403 responses for each protected action using the existing `$warga` setup.

- [ ] **Step 2: Run the reference test cases and verify they fail**

Run: `cd src/backend && php artisan test --compact tests/Feature/Api/ExpenseCategoryTest.php --filter='trashed|restore|force|bulk'`

Expected: FAIL on missing permission/routes/methods.

- [ ] **Step 3: Register the bundled permission and policy gate**

Add `'expense-categories.trash' => 'Kelola data kategori pengeluaran terhapus'` to `Permission::SYSTEM_PERMISSIONS`; add `restore(User $user): bool { return $user->hasPermission('expense-categories.trash'); }` to `ExpenseCategoryPolicy`; and register `Gate::define('expense-categories.trash', [ExpenseCategoryPolicy::class, 'restore']);` in `AppServiceProvider`.

- [ ] **Step 4: Add the ExpenseCategory filter and thin actions**

Call `$this->applyTrashedFilter($query, $request);` immediately after creating `ExpenseCategory::query()` and before pagination. Add `restore(ExpenseCategory $expenseCategory)` returning `new ExpenseCategoryResource($expenseCategory)` after `$expenseCategory->restore()`, `forceDestroy(...)` returning the `Deleted permanently` JSON response after `forceDelete()`, and `bulkRestore`/`bulkForceDestroy` delegating to the shared helpers.

- [ ] **Step 5: Add protected API routes**

Add the four routes before the `{expenseCategory}` show route. Single-record routes use `->withTrashed()->middleware('can:expense-categories.trash')`; bulk routes use the same middleware without `withTrashed()`.

- [ ] **Step 6: Grant Bendahara and verify the complete backend slice**

Add `expense-categories.trash` to the existing Bendahara permission list, run `vendor/bin/pint --dirty --format agent`, then run `php artisan test --compact tests/Feature/Api/ExpenseCategoryTest.php tests/Feature/Api/RbacTest.php`. Expected: all reference API and RBAC tests pass, including route-model binding for trashed rows and activity-log events.

- [ ] **Step 7: Commit the reference backend slice**

```bash
git add src/backend/app/Models/Permission.php src/backend/app/Policies/ExpenseCategoryPolicy.php src/backend/app/Providers/AppServiceProvider.php src/backend/app/Http/Controllers/Api/ExpenseCategoryController.php src/backend/routes/api.php src/backend/database/seeders/RoleSeeder.php src/backend/tests/Feature/Api/ExpenseCategoryTest.php
git commit -m "feat: add expense category trash actions"
```

### Task 3: Replicate backend support across the remaining seven resources

**Files:**
- Modify: `src/backend/app/Models/Permission.php`
- Modify: `src/backend/app/Providers/AppServiceProvider.php`
- Modify: `src/backend/app/Policies/ResidentPolicy.php`, `HousePolicy.php`, `DueTypePolicy.php`, `BillPolicy.php`, `PaymentPolicy.php`, `ExpensePolicy.php`, `UserPolicy.php`
- Modify: `src/backend/app/Http/Controllers/Api/ResidentController.php`, `HouseController.php`, `DueTypeController.php`, `BillController.php`, `PaymentController.php`, `ExpenseController.php`, `UserController.php`
- Modify: `src/backend/routes/api.php`

**Interfaces:**
- Adds the eight exact permissions and gates from the spec.
- Adds each resource's `restore`, `forceDestroy`, `bulkRestore`, and `bulkForceDestroy` endpoints with the resource's existing route parameter and API resource class.

- [ ] **Step 1: Add each permission and policy method**

Register these exact pairs in `Permission::SYSTEM_PERMISSIONS` and each matching policy: `residents.trash` / `Kelola data penghuni terhapus`, `houses.trash` / `Kelola data rumah terhapus`, `due-types.trash` / `Kelola data jenis iuran terhapus`, `bills.trash` / `Kelola data tagihan terhapus`, `payments.trash` / `Kelola data pembayaran terhapus`, `expenses.trash` / `Kelola data pengeluaran terhapus`, and `users.trash` / `Kelola data user terhapus`. Each policy method returns `$user->hasPermission('<resource>.trash')`.

- [ ] **Step 2: Register all remaining gates**

Add one `Gate::define('<resource>.trash', [<Policy>::class, 'restore']);` for each of the seven resources in `AppServiceProvider`.

- [ ] **Step 3: Apply the filter before pagination**

In each listed controller, call `$this->applyTrashedFilter($query, $request);` after all base/resource filters and before `paginate()`, preserving each controller's existing search, ownership, month/year, and sort behavior.

- [ ] **Step 4: Add single and bulk controller actions**

For each resource, use its existing model and API resource class. Single restore calls `restore()` and returns the resource; single force-delete calls `forceDelete()` and returns `['data' => null, 'message' => 'Deleted permanently']`; bulk methods delegate to `bulkRestore($request, Model::class)` and `bulkForceDelete($request, Model::class)`.

- [ ] **Step 5: Add all 28 routes**

For each of the seven resources, add the four paths in the spec using the existing URL segment and binding name, put single routes before the show route, apply `withTrashed()` to single routes, and apply `can:<resource>.trash` to all four routes.

- [ ] **Step 6: Format and run backend tests**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && php artisan test --compact tests/Feature/Api/ResidentTest.php tests/Feature/Api/HouseTest.php tests/Feature/Api/DueTypeTest.php tests/Feature/Api/BillTest.php tests/Feature/Api/PaymentTest.php tests/Feature/Api/ExpenseTest.php tests/Feature/Api/UserTest.php tests/Feature/Api/RbacTest.php`

Expected: existing behavior remains green; this task's new tests are added in Task 4.

- [ ] **Step 7: Commit the replicated backend implementation**

```bash
git add src/backend/app/Models/Permission.php src/backend/app/Providers/AppServiceProvider.php src/backend/app/Policies src/backend/app/Http/Controllers/Api src/backend/routes/api.php
git commit -m "feat: add trash actions to all API resources"
```

### Task 4: Add exhaustive backend feature coverage and RBAC assertions

**Files:**
- Modify: `src/backend/tests/Feature/Api/ResidentTest.php`, `HouseTest.php`, `DueTypeTest.php`, `BillTest.php`, `PaymentTest.php`, `ExpenseTest.php`, `UserTest.php`
- Modify: `src/backend/tests/Feature/Api/RbacTest.php`
- Modify: `src/backend/tests/Feature/Api/ActivityLogTest.php`

- [ ] **Step 1: Add per-resource filter tests**

In every resource test file, create one active and one trashed row, assert the default/absent request returns only active, `?trashed=with` returns both, and `?trashed=only` returns only the trashed row. Include the existing resource-specific required relations and ownership setup where the factory requires them.

- [ ] **Step 2: Add per-resource action tests**

For every resource, add success and 403 tests for single restore and force-delete, bulk restore and bulk force-delete; after force-delete assert `assertDatabaseMissing(<table>, ['id' => $id])`, and after restore assert `deleted_at` is null. Test invalid/empty bulk `ids` returns 422 using the shared validation contract.

- [ ] **Step 3: Add permission-seeding tests**

Extend `RbacTest.php` to assert Admin can invoke each resource's trash action, Bendahara can invoke only bills/payments/expenses/expense-categories trash actions, and Warga receives 403 for every trash action. Extend `PermissionTest.php` to assert the system permission count and returned names include all eight new permissions.

- [ ] **Step 4: Add activity-log assertions**

Extend `ActivityLogTest.php` to restore and force-delete a soft-deletable model, then assert `restored` and `force_deleted` actions and the exact Indonesian descriptions are recorded.

- [ ] **Step 5: Run the complete backend verification**

Run: `cd src/backend && vendor/bin/pint --dirty --format agent && php artisan test --compact`

Expected: the full PHPUnit suite passes with all eight resources covered.

- [ ] **Step 6: Commit backend verification coverage**

```bash
git add src/backend/tests/Feature/Api
git commit -m "test: cover soft-delete filters and recovery actions"
```

### Task 5: Build the ExpenseCategory frontend vertical slice

**Files:**
- Create: `src/frontend/src/components/data-table/trashed-filter.tsx`
- Modify: `src/frontend/src/types/api.ts`
- Modify: `src/frontend/src/routes/_authenticated/expense-categories/index.tsx`
- Modify: `src/frontend/src/services/expense-categories.ts`
- Modify: `src/frontend/src/hooks/use-expense-categories.ts`
- Modify: `src/frontend/src/features/siwarga-expense-categories/index.tsx`
- Modify: `src/frontend/src/features/siwarga-expense-categories/expense-categories-table.tsx`
- Modify: `src/frontend/src/features/siwarga-expense-categories/expense-categories-columns.tsx`

**Interfaces:**
- Produces `TrashedFilter` with `value: 'with' | 'only' | undefined` and `onChange(value)`.
- Produces an `TrashedFilter` field on each resource filter type and service methods `restore`, `forceDelete`, `bulkRestore`, and `bulkForceDelete`.

- [ ] **Step 1: Add frontend type and component tests**

Create `src/frontend/src/components/data-table/trashed-filter.test.tsx` covering the three labels and selecting the default option as `undefined`; add or extend the ExpenseCategory table/column test to cover active versus trashed action labels and permission gating.

- [ ] **Step 2: Run the new tests and verify they fail**

Run: `cd src/frontend && npm run test -- src/components/data-table/trashed-filter.test.tsx`

Expected: FAIL because the shared component and resource actions are not implemented.

- [ ] **Step 3: Implement the shared Select filter**

Use the existing shadcn `Select` components. Map `''` to `undefined`, `with` to `Termasuk Data Terhapus`, and `only` to `Hanya Data Terhapus`; use `Tanpa Data Terhapus` as the displayed default. Do not add `trashed` to `useTableUrlState` column definitions.

- [ ] **Step 4: Wire the ExpenseCategory URL, query, service, and mutations**

Add `trashed: z.enum(['with', 'only']).optional()` to the route schema. Forward `trashed` in `getAll`; add service calls to `/restore`, `/force-delete`, `/bulk-restore`, and `/bulk-force-delete`; add four mutation hooks invalidating `['expense-categories']` and showing Indonesian success toasts.

- [ ] **Step 5: Implement ExpenseCategory row and bulk actions**

Read permissions from `useAuthStore((s) => s.auth.user?.permissions ?? [])`. For `deleted_at === null`, preserve `Ubah`/`Hapus`; for a trashed row, show `Pulihkan` and destructive `Hapus Permanen` only when `expense-categories.trash` is present. When `search.trashed === 'only'`, replace the bulk soft-delete bar with permission-gated `Pulihkan` and `Hapus Permanen`, using non-destructive `ConfirmDialog` for restore and `MultiDeleteDialog` (type `HAPUS`) for force-delete. Reset `page` to 1 when the filter changes.

- [ ] **Step 6: Run frontend checks for the reference slice**

Run: `cd src/frontend && npm run test -- src/components/data-table/trashed-filter.test.tsx && npm run lint && npm run build`

Expected: tests, lint, TypeScript compilation, and Vite build pass.

- [ ] **Step 7: Commit the reference frontend slice**

```bash
git add src/frontend/src/components/data-table/trashed-filter.tsx src/frontend/src/components/data-table/trashed-filter.test.tsx src/frontend/src/types/api.ts src/frontend/src/routes/_authenticated/expense-categories/index.tsx src/frontend/src/services/expense-categories.ts src/frontend/src/hooks/use-expense-categories.ts src/frontend/src/features/siwarga-expense-categories
git commit -m "feat: add expense category trash UI"
```

### Task 6: Replicate frontend filtering and actions to the seven remaining resources

**Files:**
- Modify: `src/frontend/src/types/api.ts`
- Modify: `src/frontend/src/routes/_authenticated/residents/index.tsx`, `houses/index.tsx`, `due-types/index.tsx`, `bills/index.tsx`, `payments/index.tsx`, `expenses/index.tsx`, `users/index.tsx`
- Modify: `src/frontend/src/services/residents.ts`, `houses.ts`, `due-types.ts`, `bills.ts`, `payments.ts`, `expenses.ts`, `users.ts`
- Modify: `src/frontend/src/hooks/use-residents.ts`, `use-houses.ts`, `use-due-types.ts`, `use-bills.ts`, `use-payments.ts`, `use-expenses.ts`, `use-users.ts`
- Modify: `src/frontend/src/features/siwarga-residents/residents-table.tsx`, `residents-columns.tsx`, `siwarga-houses/houses-table.tsx`, `houses-columns.tsx`, `siwarga-due-types/due-types-table.tsx`, `due-types-columns.tsx`, `siwarga-bills/bills-table.tsx`, `bills-columns.tsx`, `siwarga-payments/payments-table.tsx`, `payments-columns.tsx`, `siwarga-expenses/expenses-table.tsx`, `expenses-columns.tsx`, `features/users/components/users-table.tsx`, `users-columns.tsx`

- [ ] **Step 1: Extend every filter type and route schema**

Add `trashed?: 'with' | 'only'` to the seven existing filter interfaces and add the same optional Zod enum to each route schema. Preserve each route's existing coercion/default behavior.

- [ ] **Step 2: Extend every service and hook**

Forward `trashed` through each `getAll` request. Add the exact resource-specific methods `restoreX`, `forceDeleteX`, `bulkRestoreX`, and `bulkForceDeleteX` and matching hooks, each invalidating the resource's existing list query key; preserve the existing `['bills']` invalidation after payment mutations and the existing `['houses']` invalidation after house mutations.

- [ ] **Step 3: Add filters to all seven tables**

Render the shared `TrashedFilter` as a `DataTableToolbar` child, bind it directly to `search.trashed`, call `navigate({ search: (prev) => ({ ...prev, trashed: value, page: 1 }) })`, and pass the filter into the page query. Do not model it as a TanStack column filter.

- [ ] **Step 4: Add permission-gated single-row actions**

In each columns file, branch on `row.original.deleted_at`; active rows retain current actions, trashed rows expose only `Pulihkan` and `Hapus Permanen` when the corresponding `<resource>.trash` permission is present. Use the existing row dialog state shape and icons/patterns in the feature.

- [ ] **Step 5: Add permission-gated bulk actions and dialogs**

In each table, use `search.trashed === 'only'` to render restore and permanent-delete bulk buttons instead of soft-delete. Restore uses a plain `ConfirmDialog`; force-delete reuses `MultiDeleteDialog` with `HAPUS`; clear selection and close dialogs on successful mutation. For `with` or absent, retain current soft-delete behavior.

- [ ] **Step 6: Run frontend verification**

Run: `cd src/frontend && npm run test && npm run lint && npm run build`

Expected: all existing frontend tests pass, lint is clean, and the generated route tree remains valid through the normal build process.

- [ ] **Step 7: Commit the replicated frontend implementation**

```bash
git add src/frontend/src/types/api.ts src/frontend/src/routes/_authenticated src/frontend/src/services src/frontend/src/hooks src/frontend/src/features
git commit -m "feat: add trash filters and actions to resource tables"
```

### Task 7: Synchronize MSW mocks and validate the full vertical behavior

**Files:**
- Modify: `src/frontend/src/mocks/handlers/residents.ts`, `houses.ts`, `due-types.ts`, `bills.ts`, `payments.ts`, `expenses.ts`, `expense-categories.ts`, `users.ts`
- Modify: `src/frontend/src/mocks/data/residents.ts`, `houses.ts`, `due-types.ts`, `bills.ts`, `payments.ts`, `expenses.ts`, `expense-categories.ts`, `users.ts` only where deterministic trashed fixtures are needed
- Modify: `src/frontend/src/mocks/handlers/index.ts` only if a handler is not already registered

- [ ] **Step 1: Add deterministic trashed fixtures**

Ensure each resource mock has at least one row with a non-null `deleted_at` and one active row, while preserving the existing response shapes and relations.

- [ ] **Step 2: Implement mock list filtering**

In every list handler, read `url.searchParams.get('trashed')`: return active rows for absent/invalid, active plus trashed for `with`, and only trashed for `only`; apply the existing search/pagination logic after this selection.

- [ ] **Step 3: Implement all mock mutations**

Add handlers for single restore, single force-delete, bulk restore, and bulk force-delete for all eight resources. Restore sets `deleted_at` to `null`; force-delete removes the row from the in-memory fixture; bulk handlers apply the same operation to every requested id and return the backend-shaped count message.

- [ ] **Step 4: Run mock-mode verification**

Run: `cd src/frontend && VITE_USE_MOCK=true npm run test && npm run lint && npm run build`

Expected: mock handlers compile and the UI can switch among all three filter states without an API server.

- [ ] **Step 5: Commit mock synchronization**

```bash
git add src/frontend/src/mocks
git commit -m "test: keep MSW soft-delete behavior in sync"
```

### Task 8: Final contract and regression verification

**Files:**
- Modify: none unless verification exposes an implementation defect.

- [ ] **Step 1: Verify backend routes and permission names**

Run: `cd src/backend && php artisan route:list --path=api | rg 'restore|force-delete|bulk-restore|bulk-force-delete'` and `php artisan test --compact`.

Expected: exactly four new route shapes per scoped resource, protected by the matching `.trash` gate, and the full backend suite passes.

- [ ] **Step 2: Verify frontend quality gates**

Run: `cd src/frontend && npm run test && npm run lint && npm run build && npm run format:check`.

Expected: all tests, lint, TypeScript/Vite build, and formatting checks pass.

- [ ] **Step 3: Review scope against the design**

Confirm manually that no `HouseResident` file or standalone UI received a trash filter, no deleted badge was added, active rows still expose their original actions, and force-delete cannot be reached without the resource-specific permission.

- [ ] **Step 4: Commit any verified final formatting-only changes**

```bash
git status --short
git diff --check
```

Expected: no whitespace errors; if formatting changed tracked files, commit only those intentional changes with `chore: format soft-delete implementation`.
