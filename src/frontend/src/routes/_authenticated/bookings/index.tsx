import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { BookingsPage } from '@/features/siwarga-bookings/bookings-page'

const bookingsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .union([
      z.literal('pending'),
      z.literal('approved'),
      z.literal('rejected'),
      z.literal('cancelled'),
    ])
    .optional()
    .catch(undefined),
  facility_id: z.number().optional().catch(undefined),
  search: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/bookings/')({
  validateSearch: bookingsSearchSchema,
  component: BookingsPage,
})
