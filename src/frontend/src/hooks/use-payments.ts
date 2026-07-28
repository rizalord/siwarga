import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsService } from '@/services/payments'
import type { CreatePaymentRequest } from '@/types/api'

export function usePayments(params?: { bill_id?: number; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentsService.getAll({ per_page: 1000, ...params }),
    select: (res) => res.data,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => paymentsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  })
}
