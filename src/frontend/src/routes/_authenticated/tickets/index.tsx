import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { TicketsPage } from '@/features/siwarga-tickets/tickets-page'

const ticketsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .union([z.literal('open'), z.literal('in_progress'), z.literal('resolved')])
    .optional()
    .catch(undefined),
  search: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/tickets/')({
  validateSearch: ticketsSearchSchema,
  component: TicketsPage,
})
