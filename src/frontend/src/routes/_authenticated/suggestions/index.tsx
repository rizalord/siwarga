import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SuggestionsPage } from '@/features/siwarga-suggestions/suggestions-page'

const suggestionsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  status: z
    .union([z.literal('new'), z.literal('reviewed')])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/suggestions/')({
  validateSearch: suggestionsSearchSchema,
  component: SuggestionsPage,
})
