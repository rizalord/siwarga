import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { EmergencyContactsPage } from '@/features/siwarga-panic/emergency-contacts-page'

const schema = z.object({ page: z.number().optional().catch(1) })

export const Route = createFileRoute('/_authenticated/emergency-contacts/')({
  validateSearch: schema,
  component: EmergencyContactsPage,
})
