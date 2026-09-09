import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { guestLogsService } from '@/services/guest-logs'
import type { GuestLogFilter, RegisterGuestInput } from '@/types/api'
import { toast } from 'sonner'

export function useGuestLogs(
  params?: GuestLogFilter,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['guest-logs', params],
    queryFn: () => guestLogsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
    enabled: options?.enabled ?? true,
  })
}

export function useRegisterGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterGuestInput) => guestLogsService.register(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest-logs'] })
      toast.success('Tamu berhasil didaftarkan')
    },
    onError: () => toast.error('Gagal mendaftarkan tamu'),
  })
}

export function useCheckInGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => guestLogsService.checkIn(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest-logs'] })
      toast.success('Tamu check-in')
    },
    onError: () => toast.error('Gagal check-in tamu'),
  })
}

export function useCheckOutGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => guestLogsService.checkOut(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest-logs'] })
      toast.success('Tamu check-out')
    },
    onError: () => toast.error('Gagal check-out tamu'),
  })
}
