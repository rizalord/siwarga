import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ExpensesPage } from '@/features/siwarga-expenses'

const searchSchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(10),
  month: z.coerce.number().optional(),
  year: z.coerce.number().optional(),
  category_id: z.coerce.number().optional(),
  search: z.string().optional().catch(''),
  sort: z.string().optional().catch(undefined),
  order: z
    .union([z.literal('asc'), z.literal('desc')])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/expenses/')({
  validateSearch: searchSchema,
  component: ExpensesPage,
})
