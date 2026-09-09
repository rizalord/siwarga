import { createFileRoute } from '@tanstack/react-router'
import { HouseholdVerifyPage } from '@/features/siwarga-family/household-verify-page'

export const Route = createFileRoute('/verifikasi-keluarga/$token')({
  component: HouseholdVerifyPage,
})
