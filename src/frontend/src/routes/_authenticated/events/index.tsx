import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { EventsPage } from '@/features/siwarga-events/events-page'

const eventsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .union([
      z.literal('upcoming'),
      z.literal('ongoing'),
      z.literal('completed'),
    ])
    .optional()
    .catch(undefined),
  search: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/events/')({
  validateSearch: eventsSearchSchema,
  component: EventsPage,
})
