import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ContactMessagesPage } from '@/features/siwarga-contact-messages'

const contactMessagesSearchSchema = z.object({
  page: z.number().optional().catch(1),
})

export const Route = createFileRoute('/_authenticated/contact-messages/')({
  validateSearch: contactMessagesSearchSchema,
  component: ContactMessagesPage,
})
