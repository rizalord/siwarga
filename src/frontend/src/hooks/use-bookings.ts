import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsService, facilitiesService } from '@/services/bookings'
import type {
  BookingFilter,
  CreateBookingRequest,
  FacilityFilter,
  CreateFacilityRequest,
} from '@/types/api'
import { toast } from 'sonner'

export function useFacilities(params?: FacilityFilter) {
  return useQuery({
    queryKey: ['facilities', params],
    queryFn: () => facilitiesService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useBookings(params?: BookingFilter) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => bookingsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBookingRequest) => bookingsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Pengajuan booking terkirim')
    },
    onError: () => toast.error('Gagal mengajukan booking'),
  })
}

export function useReviewBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'approve' | 'reject'; reason?: string }) =>
      action === 'approve' ? bookingsService.approve(id) : bookingsService.reject(id, reason),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      toast.success(vars.action === 'approve' ? 'Booking disetujui' : 'Booking ditolak')
    },
    onError: (e: unknown) => {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal memproses booking'
      toast.error(message)
    },
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => bookingsService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Booking dibatalkan')
    },
    onError: () => toast.error('Gagal membatalkan booking'),
  })
}

export function useCreateFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFacilityRequest) => facilitiesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities'] })
      toast.success('Fasilitas berhasil ditambahkan')
    },
    onError: () => toast.error('Gagal menambah fasilitas'),
  })
}

export function useDeleteFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => facilitiesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities'] })
      toast.success('Fasilitas berhasil dihapus')
    },
    onError: () => toast.error('Gagal menghapus fasilitas'),
  })
}
