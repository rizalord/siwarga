import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PatrolsPage } from '@/features/siwarga-patrols/patrols-page'

const patrolsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/patrols/')({
  validateSearch: patrolsSearchSchema,
  component: PatrolsPage,
})
