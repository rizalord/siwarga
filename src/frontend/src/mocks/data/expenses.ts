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
