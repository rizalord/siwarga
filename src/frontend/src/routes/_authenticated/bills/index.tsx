import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { BillsPage } from '@/features/siwarga-bills'

const billsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  month: z.string().optional().catch(''),
  year: z.string().optional().catch(''),
  status: z
    .array(z.union([z.literal('lunas'), z.literal('belum_lunas')]))
    .optional()
    .catch([]),
  due_type_id: z.array(z.string()).optional().catch([]),
  search: z.string().optional().catch(''),
  sort: z.string().optional().catch(undefined),
  trashed: z.enum(['with', 'only']).optional().catch(undefined),
  order: z
    .union([z.literal('asc'), z.literal('desc')])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/bills/')({
  validateSearch: billsSearchSchema,
  component: BillsPage,
})
