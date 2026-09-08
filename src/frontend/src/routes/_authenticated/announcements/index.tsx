import { createFileRoute } from '@tanstack/react-router'
import { AnnouncementsPage } from '@/features/siwarga-announcements'

export const Route = createFileRoute('/_authenticated/announcements/')({
  component: AnnouncementsPage,
})
