import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { FamilyPage } from '@/features/siwarga-family/family-page'

const familySearchSchema = z.object({
  page: z.number().optional().catch(1),
  search: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/family/')({
  validateSearch: familySearchSchema,
  component: FamilyPage,
})
