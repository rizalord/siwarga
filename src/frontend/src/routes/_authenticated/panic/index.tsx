import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PanicPage } from '@/features/siwarga-panic/panic-page'

const panicSearchSchema = z.object({
  page: z.number().optional().catch(1),
  status: z
    .union([
      z.literal('active'),
      z.literal('handled'),
      z.literal('resolved'),
      z.literal('cancelled'),
    ])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/panic/')({
  validateSearch: panicSearchSchema,
  component: PanicPage,
})
