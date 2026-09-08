import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PollsPage } from '@/features/siwarga-polls/polls-page'

const pollsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .union([z.literal('upcoming'), z.literal('ongoing'), z.literal('ended')])
    .optional()
    .catch(undefined),
  search: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/polls/')({
  validateSearch: pollsSearchSchema,
  component: PollsPage,
})
