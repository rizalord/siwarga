import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ResidentsPage } from '@/features/siwarga-residents'

const residentsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .array(z.union([z.literal('tetap'), z.literal('kontrak')]))
    .optional()
    .catch([]),
  search: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/residents/')({
  validateSearch: residentsSearchSchema,
  component: ResidentsPage,
})
