import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billsService } from '@/services/bills'
import type { BillFilter, GenerateBillsRequest } from '@/types/api'

export function useBills(params?: BillFilter) {
  return useQuery({
    queryKey: ['bills', params],
    queryFn: () => billsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useBill(id: number) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: () => billsService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useGenerateBills() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GenerateBillsRequest) => billsService.generate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
  })
}

export function useDeleteBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => billsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
  })
}
