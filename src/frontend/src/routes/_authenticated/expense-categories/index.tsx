import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ExpenseCategoriesPage } from '@/features/siwarga-expense-categories'

const expenseCategoriesSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  search: z.string().optional().catch(''),
  trashed: z.enum(['with', 'only']).optional().catch(undefined),
  sort: z.string().optional().catch(undefined),
  order: z
    .union([z.literal('asc'), z.literal('desc')])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/expense-categories/')({
  validateSearch: expenseCategoriesSearchSchema,
  component: ExpenseCategoriesPage,
})
