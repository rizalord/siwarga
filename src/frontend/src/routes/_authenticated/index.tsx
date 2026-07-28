import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/features/siwarga-dashboard'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})
