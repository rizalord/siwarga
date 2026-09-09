import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { AssetsPage } from '@/features/siwarga-assets/assets-page'

const assetsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .union([
      z.literal('pending'),
      z.literal('approved'),
      z.literal('rejected'),
      z.literal('returned'),
    ])
    .optional()
    .catch(undefined),
  search: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/assets/')({
  validateSearch: assetsSearchSchema,
  component: AssetsPage,
})
