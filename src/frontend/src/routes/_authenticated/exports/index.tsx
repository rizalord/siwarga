import { createFileRoute } from '@tanstack/react-router'
import { ExportsPage } from '@/features/siwarga-exports/exports-page'

export const Route = createFileRoute('/_authenticated/exports/')({
  component: ExportsPage,
})
