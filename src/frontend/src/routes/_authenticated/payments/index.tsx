import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PaymentsPage } from '@/features/siwarga-payments'

const searchSchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(10),
  month: z.coerce.number().optional(),
  year: z.coerce.number().optional(),
  search: z.string().optional().catch(''),
  sort: z.string().optional().catch(undefined),
  trashed: z.enum(['with', 'only']).optional().catch(undefined),
  order: z
    .union([z.literal('asc'), z.literal('desc')])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/payments/')({
  validateSearch: searchSchema,
  component: PaymentsPage,
})
