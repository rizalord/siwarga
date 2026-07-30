# Backend Service Pattern Refactor — Design

## 1. Goal

All 13 API controllers under `src/backend/app/Http/Controllers/Api/` mix business logic (guard rules, multi-model orchestration, side effects) with HTTP concerns (validation, response shaping). This refactor extracts the business logic into `app/Services/*Service.php` classes so controllers become thin: validate input, call a Service, return a Resource/JSON response.

This does **not** introduce Form Request classes — input validation (`$request->validate()`) stays in the controller. Scope is strictly the Service layer.

## 2. What stays in the base Controller

`app/Http/Controllers/Controller.php` already has generic CRUD helpers used via inheritance: `paginated()`, `applySorting()`, `applyTrashedFilter()`, `bulkDelete()`, `bulkRestore()`/`bulkRestoreWithCallback()`, `bulkForceDelete()`, `restoreModel()`, `forceDeleteModel()`, FK-violation handling. These are generic infra, not domain business logic — they are out of scope and remain as-is.

## 3. Services to create

One Service per resource, injected via constructor (Laravel's service container auto-resolves concrete classes — no manual binding needed since none of these are interfaces).

| Service | Controller | Responsibilities moved in |
|---|---|---|
| `AuthService` | `AuthController` | login (credential check, token issuance, activity log), logout, refresh, me |
| `ResidentService` | `ResidentController` | create/update (KTP photo upload handling), delete guard (`activeHouse` check), bulk-delete filtering |
| `HouseService` | `HouseController` | create/update, delete guard (active residents / bill history), bulk-delete filtering, `assignResident`/`vacateResident` + activity log |
| `DueTypeService` | `DueTypeController` | create/update/delete (thin, no extra guard) |
| `ExpenseCategoryService` | `ExpenseCategoryController` | create/update/delete (thin) |
| `ExpenseService` | `ExpenseController` | create (`created_by` assignment), update/delete (thin) |
| `BillService` | `BillController` | delete guard (has payments), bulk-delete filtering. `generate()` keeps calling the existing `BillGenerationService` unchanged — kept as a separate service since it's a distinct heavy/idempotent workflow |
| `PaymentService` | `PaymentController` | create (auto bill-status update), update/destroy/restore/bulk* — all logic touching `refreshBillStatuses`, wrapped in DB transactions |
| `UserService` | `UserController` | create/update (single-admin guard, password hashing, role sync), delete/bulk-delete/force-delete (admin guard) |
| `RoleService` | `RoleController` | create/update (admin-rename guard), delete (admin guard, role-in-use guard), permission sync |
| `PermissionService` | `PermissionController` | create/update (system-permission guard), delete (system-permission guard) |
| `ActivityLogService` | `ActivityLogController` | index (filter query), track |
| `ReportService` (existing) | `ReportController` | unchanged |

`BillController::generate()` currently does `new BillGenerationService()` manually — this gets fixed to constructor injection alongside the new `BillService`.

## 4. Testing

- Existing `tests/Feature/Api/*Test.php` (endpoint-level) stay as the regression net — behavior/response shape doesn't change, only where the code lives.
- New `tests/Unit/*ServiceTest.php` for Services with nontrivial branching: `UserService`/`RoleService` (single-admin guard), `HouseService`/`ResidentService`/`BillService` (delete guards), `PaymentService` (bill-status recalculation). Follows the existing `BillGenerationServiceTest.php` convention.
- Thin services (`DueTypeService`, `ExpenseCategoryService`, `ExpenseService`, `PermissionService` without complex guards, `ActivityLogService`) do not get dedicated unit tests — Feature tests already cover them.
- `composer test` (pint + phpstan + phpunit) run at the end of each batch to catch regressions.

## 5. Rollout order

Done in batches so each can be verified (tests green) before moving to the next, rather than one large change:

1. `AuthService`, `ActivityLogService` — simplest, establishes the pattern
2. `DueTypeService`, `ExpenseCategoryService`, `ExpenseService`, `PermissionService` — thin CRUD
3. `ResidentService`, `HouseService` — delete guards + assign/vacate
4. `RoleService`, `UserService` — admin guard, role sync
5. `BillService`, `PaymentService` — most complex: transactions, bill-status refresh

Each batch: extract logic → thin the controller → run related tests → move to next batch.
