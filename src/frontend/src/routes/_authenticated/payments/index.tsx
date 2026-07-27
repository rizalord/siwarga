import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PaymentsPage } from '@/features/siwarga-payments'

const searchSchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(10),
  month: z.coerce.number().optional(),
  year: z.coerce.number().optional(),
})

export const Route = createFileRoute('/_authenticated/payments/')({
  validateSearch: searchSchema,
  component: PaymentsPage,
})
