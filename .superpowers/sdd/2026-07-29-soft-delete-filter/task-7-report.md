# Task 7 Report

## Summary

Synchronized the MSW mock layer for all eight soft-delete-enabled resources so mock-mode now starts with deterministic active + trashed fixtures, list handlers honor `trashed` query modes (`absent`/invalid → active only, `with`, `only`), and single/bulk restore plus single/bulk force-delete mutate in-memory state with backend-shaped responses. I also added bulk soft-delete handlers so the existing table bulk-delete UI can produce trashed rows in mock mode.

## Files Changed

- `src/frontend/src/mocks/data/residents.ts`
- `src/frontend/src/mocks/data/houses.ts`
- `src/frontend/src/mocks/data/due-types.ts`
- `src/frontend/src/mocks/data/bills.ts`
- `src/frontend/src/mocks/data/payments.ts`
- `src/frontend/src/mocks/data/expenses.ts`
- `src/frontend/src/mocks/data/expense-categories.ts`
- `src/frontend/src/mocks/data/users.ts`
- `src/frontend/src/mocks/handlers/residents.ts`
- `src/frontend/src/mocks/handlers/houses.ts`
- `src/frontend/src/mocks/handlers/due-types.ts`
- `src/frontend/src/mocks/handlers/bills.ts`
- `src/frontend/src/mocks/handlers/payments.ts`
- `src/frontend/src/mocks/handlers/expenses.ts`
- `src/frontend/src/mocks/handlers/expense-categories.ts`
- `src/frontend/src/mocks/handlers/users.ts`
- `src/frontend/src/mocks/handlers/soft-delete.ts`
- `src/frontend/src/mocks/handlers/soft-delete.test.ts`

## Commands and Outcomes

- `npx vitest run --browser false --environment node src/mocks/handlers/soft-delete.test.ts`
  - Passed: `1` file, `2` tests
- `npm run lint`
  - Passed with `0` errors and `5` pre-existing warnings outside this task scope
- `npx tsc -b`
  - Passed
- `VITE_USE_MOCK=true npm run build`
  - Passed
- `git diff --check`
  - Passed

## Commit

- Message: `test: keep MSW soft-delete behavior in sync`
- Hash: final handoff commit (reported in task return)

## Concerns

- Frontend lint still reports the same 5 pre-existing warnings in non-mock feature files (`bills-columns`, `houses-columns`, `payment-form`, `payments-columns`, `residents-columns`).
- I used a focused Node-mode Vitest file instead of the repo’s browser-mode suite because the Playwright browser binary is not installed in this worktree and the brief explicitly asked to avoid long browser tests.
