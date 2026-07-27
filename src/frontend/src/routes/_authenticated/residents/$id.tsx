import { createFileRoute } from '@tanstack/react-router'
import { ResidentDetail } from '@/features/siwarga-residents/resident-detail'

export const Route = createFileRoute('/_authenticated/residents/$id')({
  component: ResidentDetail,
})
