import { createFileRoute } from '@tanstack/react-router'
import { MonthlyReportPage } from '@/features/siwarga-reports'

export const Route = createFileRoute('/_authenticated/reports/')({
  component: MonthlyReportPage,
})
