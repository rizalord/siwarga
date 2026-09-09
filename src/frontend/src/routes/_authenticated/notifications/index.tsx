import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { NotificationsPage } from '@/features/siwarga-notifications/notifications-page'

const notificationsSearchSchema = z.object({
  page: z.number().optional().catch(1),
})

export const Route = createFileRoute('/_authenticated/notifications/')({
  validateSearch: notificationsSearchSchema,
  component: NotificationsPage,
})
