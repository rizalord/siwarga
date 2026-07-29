# Task final fix report

Date: 2026-07-29

Status: implemented and verified in `/home/rizalord/Projects/personal/siwarga/.worktrees/soft-delete-filter`.

## Implemented fixes

- Shared backend restore/permanent-delete helpers now operate on `onlyTrashed()` rows, use instance `restore()` / `forceDelete()` inside transactions so observer events fire, reject single active-row restore/permanent-delete with controlled `422`, and convert restrictive FK force-delete failures into controlled `422` responses.
- Payment restore now recomputes related bill status for both single restore and bulk restore, restoring fully-paid bills back to `lunas`.
- Added backend regression coverage for active-ID safety, payment bill-status recomputation, bulk activity-log emission, and restrictive FK force-delete cases for bills, due types, and expense categories.
- Frontend trash-mode changes now clear `rowSelection` before navigation in all 8 list tables through a shared `handleTrashedFilterChange` helper.
- MSW soft-delete handlers now ignore active rows for restore/force-delete operations, with focused regression coverage for active-ID cases.
- Confirmed `HouseResident`, generated `routeTree`, and `src/frontend/public/mockServiceWorker.js` were not modified.

## Verification

- `vendor/bin/pint --dirty --format agent`
  - passed; fixed one `ordered_imports` issue in `src/backend/tests/Feature/Api/DueTypeTest.php`
- `php artisan test tests/Feature/Api/PaymentTest.php tests/Feature/Api/ActivityLogTest.php tests/Feature/Api/BillTest.php tests/Feature/Api/DueTypeTest.php tests/Feature/Api/ExpenseCategoryTest.php`
  - passed: 100 tests, 355 assertions
- `npx vitest run --browser false --environment node src/mocks/handlers/soft-delete.test.ts src/components/data-table/trashed-filter-change.test.ts`
  - passed: 2 files, 4 tests
- `npx tsc -b`
  - passed
- `npm run lint`
  - passed with 5 pre-existing warnings and 0 errors
- `git diff --check`
  - passed

## Concerns / follow-up

- Browser-mode Vitest / Playwright suite was not run. The documented frontend environment issue reproduced locally as missing Chromium executable under Playwright browser mode, so focused regression tests were run with `--browser false` instead.
- `npm run lint` still reports 5 existing warnings in:
  - `src/frontend/src/features/siwarga-bills/bills-columns.tsx`
  - `src/frontend/src/features/siwarga-houses/houses-columns.tsx`
  - `src/frontend/src/features/siwarga-payments/payment-form.tsx`
  - `src/frontend/src/features/siwarga-payments/payments-columns.tsx`
  - `src/frontend/src/features/siwarga-residents/residents-columns.tsx`
