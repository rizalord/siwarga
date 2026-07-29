import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsService } from '@/services/payments'
import type { CreatePaymentRequest, PaymentFilter } from '@/types/api'
import { toast } from 'sonner'

export function usePayments(params?: PaymentFilter) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function usePayment(id: number) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentsService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePaymentRequest) => paymentsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Pembayaran berhasil dicatat')
    },
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => paymentsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Pembayaran berhasil dihapus')
    },
  })
}

export function useRestorePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => paymentsService.restore(id),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success(response.data.message ?? 'Pembayaran berhasil dipulihkan')
    },
  })
}

export function useForceDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => paymentsService.forceDelete(id),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success(
        response.data.message ?? 'Pembayaran berhasil dihapus permanen'
      )
    },
  })
}

export function useBulkDeletePayments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => paymentsService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Pembayaran terpilih berhasil dihapus')
    },
  })
}

export function useBulkRestorePayments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => paymentsService.bulkRestore(ids),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success(
        response.data.message ?? 'Pembayaran terpilih berhasil dipulihkan'
      )
    },
  })
}

export function useBulkForceDeletePayments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => paymentsService.bulkForceDelete(ids),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success(
        response.data.message ?? 'Pembayaran terpilih berhasil dihapus permanen'
      )
    },
  })
}
