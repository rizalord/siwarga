import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { GuestLogsPage } from '@/features/siwarga-guest-logs/guest-logs-page'

const guestLogsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  status: z
    .union([
      z.literal('registered'),
      z.literal('checked_in'),
      z.literal('checked_out'),
    ])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/guest-logs/')({
  validateSearch: guestLogsSearchSchema,
  component: GuestLogsPage,
})
