import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { HousesPage } from '@/features/siwarga-houses'

const housesSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .array(z.union([z.literal('dihuni'), z.literal('kosong')]))
    .optional()
    .catch([]),
  search: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/houses/')({
  validateSearch: housesSearchSchema,
  component: HousesPage,
})
