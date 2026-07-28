import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PermissionsPage } from '@/features/siwarga-permissions'

const permissionsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  search: z.string().optional().catch(''),
  sort: z.string().optional().catch(undefined),
  order: z.union([z.literal('asc'), z.literal('desc')]).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/permissions/')({
  validateSearch: permissionsSearchSchema,
  component: PermissionsPage,
})
