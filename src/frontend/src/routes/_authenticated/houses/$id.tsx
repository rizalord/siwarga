import { createFileRoute } from '@tanstack/react-router'
import { HouseDetail } from '@/features/siwarga-houses/house-detail'

export const Route = createFileRoute('/_authenticated/houses/$id')({
  component: HouseDetail,
})
