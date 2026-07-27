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
  search: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/bills/')({
  validateSearch: billsSearchSchema,
  component: BillsPage,
})
