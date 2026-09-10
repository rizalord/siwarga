import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { CctvPage } from '@/features/siwarga-cctv/cctv-page'

const cctvSearchSchema = z.object({
  page: z.coerce.number().optional().catch(1),
  camera_id: z.coerce.number().optional().catch(undefined),
  event_type: z
    .union([
      z.literal('motion'),
      z.literal('panic'),
      z.literal('manual'),
      z.literal('simulated'),
    ])
    .optional()
    .catch(undefined),
  date: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/cctv/')({
  validateSearch: cctvSearchSchema,
  component: CctvPage,
})
