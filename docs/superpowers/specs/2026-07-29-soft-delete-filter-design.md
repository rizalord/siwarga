# Soft-delete filter, restore & force-delete — Design

## Goal

Every table backed by a soft-deletable model gets a filter with three states (Indonesian labels):

- **Tanpa Data Terhapus** (default) — excludes soft-deleted rows, current behavior.
- **Termasuk Data Terhapus** — includes soft-deleted rows alongside active ones.
- **Hanya Data Terhapus** — shows only soft-deleted rows.

Rows that are soft-deleted also get row-level and bulk **Pulihkan** (restore) and **Hapus Permanen**
(force delete) actions, gated by a new permission per resource.

## Scope

Applies to the 8 resources that have `deleted_at` (SoftDeletes trait) *and* their own list page:

- Residents
- Houses
- DueTypes
- Bills
- Payments
- Expenses
- ExpenseCategories
- Users

`HouseResident` is excluded: it has `deleted_at` but no standalone list page (managed inline under
Houses), so there is no table to add the filter to.

No visual "deleted" badge on rows — out of scope per user decision.

## Backend

### Trashed filter

Add `Controller::applyTrashedFilter(Builder $query, Request $request): Builder`, mirroring the
existing `applySorting()` helper:

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

Call it from `index()` in all 8 controllers (`ResidentController`, `HouseController`,
`DueTypeController`, `BillController`, `PaymentController`, `ExpenseController`,
`ExpenseCategoryController`, `UserController`), before pagination.

Existing default index query behavior (excluding trashed) is unchanged when `trashed` is absent or
any value other than `with`/`only`.

### Permissions

One new permission per resource, bundling both restore and force-delete (mirrors the existing
`.manage`-style bundling already used for expense-categories/due-types/users):

```
residents.trash          => 'Kelola data penghuni terhapus'
houses.trash              => 'Kelola data rumah terhapus'
due-types.trash           => 'Kelola data jenis iuran terhapus'
bills.trash                => 'Kelola data tagihan terhapus'
payments.trash             => 'Kelola data pembayaran terhapus'
expenses.trash              => 'Kelola data pengeluaran terhapus'
expense-categories.trash    => 'Kelola data kategori pengeluaran terhapus'
users.trash                  => 'Kelola data user terhapus'
```

Added to `Permission::SYSTEM_PERMISSIONS`. Each gets one `Gate::define('<resource>.trash', [XPolicy::class, 'restore'])`
in `AppServiceProvider::boot()`, and each Policy gets a `restore(User $user): bool` method doing
`$user->hasPermission('<resource>.trash')` (this is the existing 1-gate-per-permission convention;
`forceDelete` reuses the same gate, it does not get its own permission).

`RoleSeeder`:
- Admin: automatic via `Permission::all()`.
- Bendahara: add `bills.trash`, `payments.trash`, `expenses.trash`, `expense-categories.trash`
  (matches the resources it already manages).
- Warga: none.

### Routes

Per resource (pattern shown for expense-categories; same for the other 7, using each resource's
existing route-name segment):

```php
Route::post('expense-categories/{expenseCategory}/restore', [ExpenseCategoryController::class, 'restore'])
    ->withTrashed()
    ->middleware('can:expense-categories.trash');
Route::delete('expense-categories/{expenseCategory}/force-delete', [ExpenseCategoryController::class, 'forceDestroy'])
    ->withTrashed()
    ->middleware('can:expense-categories.trash');
Route::post('expense-categories/bulk-restore', [ExpenseCategoryController::class, 'bulkRestore'])
    ->middleware('can:expense-categories.trash');
Route::post('expense-categories/bulk-force-delete', [ExpenseCategoryController::class, 'bulkForceDestroy'])
    ->middleware('can:expense-categories.trash');
```

`->withTrashed()` on the single-record routes so route-model binding can resolve soft-deleted rows.

Controller methods are thin:

```php
public function restore(ExpenseCategory $expenseCategory)
{
    $expenseCategory->restore();
    return new ExpenseCategoryResource($expenseCategory);
}

public function forceDestroy(ExpenseCategory $expenseCategory)
{
    $expenseCategory->forceDelete();
    return response()->json(['data' => null, 'message' => 'Deleted permanently']);
}
```

Base `Controller` gets `bulkRestore()` and `bulkForceDelete()` helpers mirroring the existing
`bulkDelete()` helper (validate `ids`, call `$modelClass::withTrashed()->whereIn('id', $ids)->restore()`
/ `->forceDelete()`, return a count message).

### Activity log

`ActivityLogObserver` gets two more handlers (Eloquent already fires these events for SoftDeletes
models, and all 8 models are already registered in `AppServiceProvider::registerActivityLogObservers()`):

```php
public function restored(Model $model): void
{
    [$label, $identifier] = $this->describe($model);
    ActivityLog::record('restored', "Memulihkan {$label}: {$identifier}", $model);
}

public function forceDeleted(Model $model): void
{
    [$label, $identifier] = $this->describe($model);
    ActivityLog::record('force_deleted', "Menghapus permanen {$label}: {$identifier}", $model);
}
```

### Tests

Feature tests per resource (extending existing `tests/Feature/Api/*Test.php` files) covering:
- `index` with `trashed=with` / `trashed=only` / absent.
- `restore` success + 403 without permission.
- `force-delete` success + 403 without permission + confirms row is actually gone.
- Bulk restore / bulk force-delete, same permission checks.
- `RbacTest.php` extended for the new permissions.

## Frontend

### Trashed filter UI

New shared component `src/components/data-table/trashed-filter.tsx`: a single-select `Select`
(not the multi-select `DataTableFacetedFilter` used for `status`), matching the existing
month/year filter pattern in Expenses (a plain shadcn `Select` passed as a `DataTableToolbar`
child, not routed through `useTableUrlState`'s column-filter machinery, since "trashed" isn't a
real column on the row data):

```tsx
type TrashedFilterProps = {
  value: 'with' | 'only' | undefined
  onChange: (value: 'with' | 'only' | undefined) => void
}
```

Options or values map to: `undefined` → "Tanpa Data Terhapus", `'with'` → "Termasuk Data Terhapus",
`'only'` → "Hanya Data Terhapus".

Each route's search schema (e.g. `/_authenticated/expense-categories/`) gets an optional
`trashed: z.enum(['with', 'only']).optional()`. Each list page's query hook call and matching
service function forward `trashed` through to the API request. Selecting a value resets `page`
to the default, same as other filters.

### Row actions

In each `*-columns.tsx`, `DataTableRowActions` branches on `row.original.deleted_at`:
- `null` (active row): existing "Ubah" / "Hapus" items (unchanged).
- non-null (trashed row, only reachable when the filter is `with`/`only`): "Pulihkan" and
  "Hapus Permanen" items instead. Both hidden unless the user's permissions include
  `<resource>.trash` (inline `useAuthStore((s) => s.auth.user?.permissions ?? [])` check — the
  existing pattern in this codebase; there is no dedicated permission hook).

### Bulk actions

In each `*-table.tsx`, when `search.trashed === 'only'`, the bulk-actions bar shows "Pulihkan" and
"Hapus Permanen" buttons instead of the existing "Hapus" button (both permission-gated the same
way as row actions). When `search.trashed` is `with` or absent, bulk delete behaves as today
(only active rows are selectable for delete in practice, since that's the existing single-delete
affordance).

### Dialogs

- Single restore: plain `ConfirmDialog` (non-destructive wording, no destructive style).
- Single force-delete: `ConfirmDialog` with `destructive`, matching today's single soft-delete UX
  (no type-to-confirm).
- Bulk force-delete: reuse `MultiDeleteDialog` (type "HAPUS" to confirm), matching today's bulk
  soft-delete UX. Bulk restore: a simpler bulk `ConfirmDialog`, non-destructive.

### Hooks & services

Each `use-<resource>.ts` gets `useRestoreX`, `useForceDeleteX`, `useBulkRestoreX`,
`useBulkForceDeleteX` mutation hooks, invalidating the same query keys as the existing delete
hooks. Each `services/<resource>.ts` gets matching `restoreX`, `forceDeleteX`, `bulkRestoreX`,
`bulkForceDeleteX` functions, and the existing `getX` list function forwards a `trashed` param.

### Mocks

MSW handlers per resource updated to honor `trashed` in the list handler, and to add
restore/force-delete/bulk-restore/bulk-force-delete handlers, so `VITE_USE_MOCK=true` stays in
sync.

## Implementation order

Build the full vertical slice (backend + frontend + tests) for **ExpenseCategory** first as the
reference implementation (simplest resource, no extra relations), verify it end-to-end, then
replicate the same pattern to the remaining 7 resources.

## Out of scope

- No visual "deleted" badge/indicator on rows.
- No new fine-grained permission split between restore and force-delete (one bundled `.trash`
  permission per resource).
- No changes to `HouseResident` (no standalone list page).
