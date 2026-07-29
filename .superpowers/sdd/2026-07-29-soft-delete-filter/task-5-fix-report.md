# Task 5 Fix Report

Status: completed.

Fixed the reviewed bulk soft-delete wording issue:

- Added configurable `deletionType` to `MultiDeleteDialog`, with `permanent` as the backward-compatible default.
- Soft-delete wording now explains that records move to deleted data and can be restored later.
- Permanent-delete wording retains the irreversible warning and `HAPUS` confirmation flow.
- `ExpenseCategoriesTable` passes `deletionType='soft'` to the existing `bulkDelete` dialog and `deletionType='permanent'` to the `bulkForceDelete` dialog.
- `src/frontend/public/mockServiceWorker.js` was not modified.

Verification:

- `npx eslint src/components/multi-delete-dialog.tsx src/features/siwarga-expense-categories/expense-categories-table.tsx` passed.
- `git diff --check` passed.
- Browser tests were not run, per instruction.

Concerns:

- No functional concerns identified for this scoped fix.
