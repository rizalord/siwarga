import { createFileRoute } from '@tanstack/react-router'
import { PagesPage } from '@/features/siwarga-pages'

export const Route = createFileRoute('/_authenticated/pages/')({
  component: PagesPage,
})
