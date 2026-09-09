import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PaymentsOnlinePage } from '@/features/siwarga-payments-online/payments-online-page'

const paymentsOnlineSearchSchema = z.object({
  page: z.number().optional().catch(1),
  status: z
    .union([
      z.literal('pending'),
      z.literal('awaiting_verification'),
      z.literal('paid'),
      z.literal('expired'),
      z.literal('failed'),
      z.literal('rejected'),
    ])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/payments-online/')({
  validateSearch: paymentsOnlineSearchSchema,
  component: PaymentsOnlinePage,
})
