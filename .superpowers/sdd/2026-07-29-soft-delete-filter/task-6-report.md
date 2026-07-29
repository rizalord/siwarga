# Task 6 Report

## Status

DONE_WITH_CONCERNS

## Summary

Replicated the ExpenseCategory frontend trash-management pattern to the seven remaining resources: Residents, Houses, DueTypes, Bills, Payments, Expenses, and Users.

Implemented:

- `trashed` search schema support on each route
- `trashed` forwarding through each service and list hook
- restore / force-delete / bulk-restore / bulk-force-delete service+hook methods
- toolbar `TrashedFilter` wiring with page reset on change
- trashed-row action branching (`Pulihkan` / `Hapus Permanen`) gated by each resource’s `<resource>.trash` permission
- bulk soft-delete vs restore/force-delete branching based on `search.trashed === 'only'`
- soft-delete copy updates for existing delete dialogs so active-row deletes now describe moving records to trash instead of permanent removal

Explicitly left untouched per brief:

- `src/frontend/public/mockServiceWorker.js`
- `HouseResident` frontend/backend flows
- generated `routeTree`
- browser test execution

## Files Changed

Routes:

- `src/frontend/src/routes/_authenticated/residents/index.tsx`
- `src/frontend/src/routes/_authenticated/houses/index.tsx`
- `src/frontend/src/routes/_authenticated/due-types/index.tsx`
- `src/frontend/src/routes/_authenticated/bills/index.tsx`
- `src/frontend/src/routes/_authenticated/payments/index.tsx`
- `src/frontend/src/routes/_authenticated/expenses/index.tsx`
- `src/frontend/src/routes/_authenticated/users/index.tsx`

Services:

- `src/frontend/src/services/residents.ts`
- `src/frontend/src/services/houses.ts`
- `src/frontend/src/services/due-types.ts`
- `src/frontend/src/services/bills.ts`
- `src/frontend/src/services/payments.ts`
- `src/frontend/src/services/expenses.ts`
- `src/frontend/src/services/users.ts`

Hooks:

- `src/frontend/src/hooks/use-residents.ts`
- `src/frontend/src/hooks/use-houses.ts`
- `src/frontend/src/hooks/use-due-types.ts`
- `src/frontend/src/hooks/use-bills.ts`
- `src/frontend/src/hooks/use-payments.ts`
- `src/frontend/src/hooks/use-expenses.ts`
- `src/frontend/src/hooks/use-users.ts`

Feature/UI files:

- `src/frontend/src/features/siwarga-residents/index.tsx`
- `src/frontend/src/features/siwarga-residents/resident-delete-dialog.tsx`
- `src/frontend/src/features/siwarga-residents/residents-columns.tsx`
- `src/frontend/src/features/siwarga-residents/residents-provider.tsx`
- `src/frontend/src/features/siwarga-residents/residents-table.tsx`
- `src/frontend/src/features/siwarga-houses/index.tsx`
- `src/frontend/src/features/siwarga-houses/house-delete-dialog.tsx`
- `src/frontend/src/features/siwarga-houses/houses-columns.tsx`
- `src/frontend/src/features/siwarga-houses/houses-provider.tsx`
- `src/frontend/src/features/siwarga-houses/houses-table.tsx`
- `src/frontend/src/features/siwarga-due-types/index.tsx`
- `src/frontend/src/features/siwarga-due-types/due-types-columns.tsx`
- `src/frontend/src/features/siwarga-due-types/due-types-table.tsx`
- `src/frontend/src/features/siwarga-bills/index.tsx`
- `src/frontend/src/features/siwarga-bills/bills-columns.tsx`
- `src/frontend/src/features/siwarga-bills/bills-provider.tsx`
- `src/frontend/src/features/siwarga-bills/bills-table.tsx`
- `src/frontend/src/features/siwarga-payments/index.tsx`
- `src/frontend/src/features/siwarga-payments/payment-delete-dialog.tsx`
- `src/frontend/src/features/siwarga-payments/payments-columns.tsx`
- `src/frontend/src/features/siwarga-payments/payments-provider.tsx`
- `src/frontend/src/features/siwarga-payments/payments-table.tsx`
- `src/frontend/src/features/siwarga-expenses/index.tsx`
- `src/frontend/src/features/siwarga-expenses/expenses-columns.tsx`
- `src/frontend/src/features/siwarga-expenses/expenses-table.tsx`
- `src/frontend/src/features/users/index.tsx`
- `src/frontend/src/features/users/components/users-columns.tsx`
- `src/frontend/src/features/users/components/users-table.tsx`

Related static typing cleanup:

- `src/frontend/src/components/data-table/trashed-filter.tsx`
- `src/frontend/src/features/siwarga-expense-categories/expense-categories-columns.test.tsx`

## Verification

Ran:

- `cd src/frontend && npm run lint`
  - exit 0
  - result: no lint errors, 5 warnings remain
- `cd src/frontend && npx tsc -b`
  - exit 0
- `git diff --check`
  - exit 0

## Concerns

1. Browser tests were intentionally not run, per brief/instruction.
2. `npm run lint` still reports 5 warnings:
   - `react-refresh/only-export-components` warnings in:
     - `src/features/siwarga-bills/bills-columns.tsx`
     - `src/features/siwarga-houses/houses-columns.tsx`
     - `src/features/siwarga-payments/payments-columns.tsx`
     - `src/features/siwarga-residents/residents-columns.tsx`
   - existing `react-hooks/incompatible-library` warning in:
     - `src/features/siwarga-payments/payment-form.tsx`
3. I updated `expense-categories-columns.test.tsx` only to satisfy current TypeScript checking after `npx tsc -b`; it does not change the tested behavior.
