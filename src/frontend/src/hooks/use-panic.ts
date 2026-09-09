import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { panicService, emergencyContactsService } from '@/services/panic'
import type { PanicFilter } from '@/types/api'
import { toast } from 'sonner'

export function usePanicAlerts(
  params?: PanicFilter,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['panic-alerts', params],
    queryFn: () => panicService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
    enabled: options?.enabled ?? true,
    refetchInterval: (query) =>
      query.state.data?.data.data.some((a) => a.status === 'active')
        ? 15000
        : false,
  })
}

export function useReportPanic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { location_note?: string; note?: string }) =>
      panicService.report(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['panic-alerts'] })
      toast.success('Laporan darurat terkirim ke satpam')
    },
    onError: () => toast.error('Gagal mengirim laporan darurat'),
  })
}

export function useHandlePanic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => panicService.handle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['panic-alerts'] })
      toast.success('Alert ditangani')
    },
    onError: () => toast.error('Gagal menangani alert'),
  })
}

export function useResolvePanic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => panicService.resolve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['panic-alerts'] })
      toast.success('Alert diselesaikan')
    },
    onError: () => toast.error('Gagal menyelesaikan alert'),
  })
}

export function useCancelPanic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => panicService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['panic-alerts'] })
      toast.success('Alert dibatalkan')
    },
    onError: () => toast.error('Gagal membatalkan alert'),
  })
}

export function useEmergencyContacts() {
  return useQuery({
    queryKey: ['emergency-contacts'],
    queryFn: () => emergencyContactsService.getAll(),
    select: (res) => res.data,
  })
}
